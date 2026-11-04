import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import BookingClient from "./_client";
import { amountFor, resolveTherapyType } from "@/lib/pricing";
import { AppHeader } from "@/components/AppHeader";
import { safeTimeZone, toSlotOptions } from "@/lib/availability";
import { getBookableSlots } from "@/lib/therapistSlots";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ therapistId?: string; therapistProfileId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "patient") redirect("/dashboard");

  const params = await searchParams;
  const therapistUserId = Number(params.therapistId);
  const therapistProfileId = Number(params.therapistProfileId);

  if (!therapistUserId || !therapistProfileId) redirect("/therapists");

  const [therapistProfile, patientProfile, assignment] = await Promise.all([
    prisma.therapistProfile.findUnique({
      where: { id: therapistProfileId },
      select: { firstName: true, lastName: true, id: true, isVerified: true, userId: true },
    }),
    prisma.patientProfile.findUnique({
      where: { userId: Number(session.user.id) },
      select: { id: true, sessionCredits: true, onboardingAnswers: true, timezone: true },
    }),
    prisma.patientTherapistAssignment.findFirst({
      where: { patientId: Number(session.user.id), therapistId: therapistUserId, status: "active" },
      select: { id: true },
    }),
  ]);

  if (!therapistProfile || !therapistProfile.isVerified || therapistProfile.userId !== therapistUserId) notFound();
  if (!assignment) redirect("/therapists?error=assign");
  if (!patientProfile || patientProfile.sessionCredits < 1) redirect("/subscription?error=credit");

  const therapistId = therapistUserId;
  const therapistName = `${therapistProfile.firstName} ${therapistProfile.lastName}`;
  // Le prix affiché est toujours le tarif catalogue plateforme (lib/pricing.ts)
  // — les thérapeutes n'ont plus de tarif propre, voir lib/commission.ts.
  const answers = patientProfile.onboardingAnswers as { therapyType?: string } | null;
  const rate = amountFor(resolveTherapyType(answers), "single");

  const { configured, slots } = await getBookableSlots(therapistId);

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="patient" displayName={session.user.email ?? "Mon compte"} />
      <BookingClient
        therapistId={therapistId}
        therapistName={therapistName}
        rate={rate}
        configured={configured}
        slots={toSlotOptions(slots, safeTimeZone(patientProfile.timezone))}
      />
    </div>
  );
}
