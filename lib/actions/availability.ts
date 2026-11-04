'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { SESSION_MINUTES, safeTimeZone, timeToMinutes, zonedTimeToUtc } from "@/lib/availability";

const PAGE = "/disponibilites";

async function requireTherapist(): Promise<{ id: number; email?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");
  return { id: Number(session.user.id), email: session.user.email ?? undefined };
}

export async function addAvailabilityAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();

  const weekday = Number(formData.get("weekday"));
  const startMinute = timeToMinutes(String(formData.get("start")));
  const endMinute = timeToMinutes(String(formData.get("end")));

  if (
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    startMinute === null ||
    endMinute === null ||
    endMinute - startMinute < SESSION_MINUTES
  ) {
    redirect(`${PAGE}?error=range`);
  }

  const overlapping = await prisma.therapistAvailability.findFirst({
    where: {
      therapistId: therapist.id,
      weekday,
      startMinute: { lt: endMinute },
      endMinute: { gt: startMinute },
    },
    select: { id: true },
  });
  if (overlapping) redirect(`${PAGE}?error=overlap`);

  await prisma.therapistAvailability.create({
    data: { therapistId: therapist.id, weekday, startMinute, endMinute },
  });
  await logAudit({ actor: therapist, action: "therapist.availability.add", metadata: { weekday, startMinute, endMinute } });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function removeAvailabilityAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();
  const id = Number(formData.get("id"));

  await prisma.therapistAvailability.deleteMany({ where: { id, therapistId: therapist.id } });
  await logAudit({ actor: therapist, action: "therapist.availability.remove", metadata: { id } });

  revalidatePath(PAGE);
  redirect(PAGE);
}

function parseDate(value: FormDataEntryValue | null): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

export async function addUnavailabilityAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();

  const first = parseDate(formData.get("from"));
  const last = parseDate(formData.get("to"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  if (!first || !last) redirect(`${PAGE}?error=dates`);

  const profile = await prisma.therapistProfile.findUnique({
    where: { userId: therapist.id },
    select: { timezone: true },
  });
  const timeZone = safeTimeZone(profile?.timezone);

  const startsAt = zonedTimeToUtc(first.year, first.month, first.day, 0, timeZone);
  const endsAt = zonedTimeToUtc(last.year, last.month, last.day + 1, 0, timeZone);
  if (endsAt <= startsAt) redirect(`${PAGE}?error=dates`);

  await prisma.therapistUnavailability.create({
    data: { therapistId: therapist.id, startsAt, endsAt, reason },
  });
  await logAudit({ actor: therapist, action: "therapist.unavailability.add" });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function removeUnavailabilityAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();
  const id = Number(formData.get("id"));

  await prisma.therapistUnavailability.deleteMany({ where: { id, therapistId: therapist.id } });
  await logAudit({ actor: therapist, action: "therapist.unavailability.remove", metadata: { id } });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function updateTherapistTimezoneAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();
  const timezone = String(formData.get("timezone"));
  if (safeTimeZone(timezone) !== timezone) redirect(`${PAGE}?error=timezone`);

  await prisma.therapistProfile.update({ where: { userId: therapist.id }, data: { timezone } });
  await logAudit({ actor: therapist, action: "therapist.timezone.update", metadata: { timezone } });

  revalidatePath(PAGE);
  redirect(PAGE);
}
