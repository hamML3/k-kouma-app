import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import RoomClient from "./_client";

export default async function RoomPage({
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
        select: {
          id: true,
          patientProfile: { select: { nickname: true } },
          email: true,
        },
      },
      therapist: {
        select: {
          id: true,
          therapistProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!appointment) notFound();

  const isPatient = appointment.patientId === userId;
  const isTherapist = appointment.therapistId === userId;
  if (!isPatient && !isTherapist) notFound();

  if (appointment.status !== "confirmed") redirect("/appointments");
  if (!appointment.webrtcRoomId) redirect("/appointments");

  const role: "patient" | "therapist" = isPatient ? "patient" : "therapist";

  const patientName = appointment.patient.patientProfile?.nickname ?? appointment.patient.email;
  const therapistName =
    `${appointment.therapist.therapistProfile?.firstName ?? ""} ${appointment.therapist.therapistProfile?.lastName ?? ""}`.trim();
  const otherName = isPatient ? therapistName : patientName;
  const otherId = isPatient ? appointment.therapistId : appointment.patientId;

  return (
    <RoomClient
      roomId={appointment.webrtcRoomId}
      role={role}
      isVideoCall={appointment.type !== "text"}
      videoEnabled={appointment.type === "video"}
      otherName={otherName || "Participant"}
      otherId={otherId}
      scheduledAt={appointment.scheduledAt.toISOString()}
      durationMinutes={appointment.durationMinutes}
      appointmentId={appointment.id}
      userId={userId}
    />
  );
}
