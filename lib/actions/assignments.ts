'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canChooseCoach } from "@/lib/practitioners";

async function requirePatientId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "patient") redirect("/dashboard");
  return Number(session.user.id);
}

// Patient chooses a therapist — deactivates any existing active assignment first
export async function chooseTherapistAction(formData: FormData): Promise<void> {
  const patientId = await requirePatientId();
  const therapistId = Number(formData.get("therapistId"));

  if (!therapistId) redirect("/therapists");

  const therapist = await prisma.therapistProfile.findFirst({
    where: { userId: therapistId, isVerified: true, user: { status: "active" } },
    select: { id: true, practitionerKind: true },
  });
  if (!therapist) redirect("/therapists");

  if (therapist.practitionerKind === "coach") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { onboardingAnswers: true },
    });
    const answers = patient?.onboardingAnswers as { safety?: string; therapyType?: string } | null;
    if (!canChooseCoach(answers)) redirect("/therapists?error=coach");
  }

  // Deactivate any currently active assignment for this patient
  await prisma.patientTherapistAssignment.updateMany({
    where: { patientId, status: "active" },
    data:  { status: "paused" },
  });

  // Upsert the new assignment
  await prisma.patientTherapistAssignment.upsert({
    where:  { patientId_therapistId: { patientId, therapistId } },
    create: { patientId, therapistId, status: "active" },
    update: { status: "active" },
  });

  revalidatePath("/dashboard");
  revalidatePath("/therapists");
  redirect("/therapists?chosen=1");
}

// Patient changes their therapist
export async function changeTherapistAction(): Promise<void> {
  const patientId = await requirePatientId();

  await prisma.patientTherapistAssignment.updateMany({
    where: { patientId, status: "active" },
    data:  { status: "paused" },
  });

  revalidatePath("/dashboard");
  redirect("/therapists");
}
