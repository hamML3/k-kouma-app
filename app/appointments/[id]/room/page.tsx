import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RoomClient from "./_client";
import { sessionPhase, sessionWindow } from "@/lib/sessionWindow";

function RoomClosed({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "var(--kk-dark)" }}>
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-lora)" }}>
          {title}
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
          {text}
        </p>
        <Link href="/appointments" className="kk-btn-purple inline-block px-6 py-2.5 text-sm">
          Mes rendez-vous
        </Link>
      </div>
    </div>
  );
}

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

  // Une séance dure une heure : la salle ouvre 15 minutes avant et ferme à la fin.
  const phase = sessionPhase(appointment.scheduledAt, appointment.durationMinutes);
  const { opensAt, endsAt } = sessionWindow(appointment.scheduledAt, appointment.durationMinutes);
  const time = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });
  if (phase === "early") {
    return (
      <RoomClosed
        title="La séance n'a pas encore commencé"
        text={`La salle ouvrira à ${time(opensAt)}, 15 minutes avant le début (${time(appointment.scheduledAt)}, heure de Bamako).`}
      />
    );
  }
  if (phase === "ended") {
    return <RoomClosed title="Séance terminée" text={`Cette séance s'est terminée à ${time(endsAt)}. Une séance dure ${appointment.durationMinutes || 60} minutes.`} />;
  }

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
      endsAt={endsAt.toISOString()}
      appointmentId={appointment.id}
    />
  );
}
