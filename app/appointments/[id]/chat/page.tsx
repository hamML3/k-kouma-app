import { auth } from "@/auth";
import { sessionWindow } from "@/lib/sessionWindow";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ChatClient from "./_client";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const appointmentId = Number(id);
  if (isNaN(appointmentId)) notFound();

  const userId = Number(session.user.id);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: { id: true, patientProfile: { select: { nickname: true } }, email: true },
      },
      therapist: {
        select: { id: true, therapistProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!appointment) notFound();

  const isPatient = appointment.patientId === userId;
  const isTherapist = appointment.therapistId === userId;
  if (!isPatient && !isTherapist) notFound();

  if (appointment.type !== "text") redirect(`/appointments/${appointmentId}/room`);
  if (appointment.status !== "confirmed") redirect("/appointments");

  const patientName = appointment.patient.patientProfile?.nickname ?? appointment.patient.email;
  const therapistName =
    `${appointment.therapist.therapistProfile?.firstName ?? ""} ${appointment.therapist.therapistProfile?.lastName ?? ""}`.trim();
  const otherName = isPatient ? therapistName : patientName;
  const otherId = isPatient ? appointment.therapistId : appointment.patientId;

  const initialMessages = await prisma.message.findMany({
    where: { appointmentId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, senderId: true, body: true, createdAt: true },
  });

  return (
    <ChatClient
      appointmentId={appointment.id}
      userId={userId}
      role={session.user.role}
      otherName={otherName || "Participant"}
      otherId={otherId}
      durationMinutes={appointment.durationMinutes}
      opensAt={sessionWindow(appointment.scheduledAt, appointment.durationMinutes).opensAt.toISOString()}
      endsAt={sessionWindow(appointment.scheduledAt, appointment.durationMinutes).endsAt.toISOString()}
      initialMessages={initialMessages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  );
}
