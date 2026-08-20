import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import BookingClient from "./_client";

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
      select: { firstName: true, lastName: true, hourlyRate: true, id: true, isVerified: true, userId: true },
    }),
    prisma.patientProfile.findUnique({
      where: { userId: Number(session.user.id) },
      select: { id: true },
    }),
    prisma.patientTherapistAssignment.findFirst({
      where: { patientId: Number(session.user.id), therapistId: therapistUserId, status: "active" },
      select: { id: true },
    }),
  ]);

  if (!therapistProfile || !therapistProfile.isVerified || therapistProfile.userId !== therapistUserId) notFound();
  if (!assignment) redirect("/therapists?error=assign");

  const patientId = Number(session.user.id);
  const therapistId = therapistUserId;
  const therapistName = `${therapistProfile.firstName} ${therapistProfile.lastName}`;
  const rate = Number(therapistProfile.hourlyRate);

  return (
    <BookingClient
      patientId={patientId}
      therapistId={therapistId}
      therapistName={therapistName}
      rate={rate}
      displayName={session.user.email ?? "Mon compte"}
    />
  );
}
