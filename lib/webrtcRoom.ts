import { prisma } from "@/lib/prisma";
import { sessionPhase } from "@/lib/sessionWindow";

export type RoomRole = "patient" | "therapist";

// Le rôle de l'appelant dans cette salle se déduit du rendez-vous, jamais de la
// requête : un participant ne doit pas pouvoir se faire passer pour l'autre.
// Hors de la fenêtre de la séance (voir lib/sessionWindow.ts), la salle est
// fermée : personne ne peut s'y reconnecter une fois l'heure écoulée.
export async function participantRole(roomId: string, userId: number): Promise<RoomRole | null> {
  const appt = await prisma.appointment.findFirst({
    where: { webrtcRoomId: roomId },
    select: { patientId: true, therapistId: true, scheduledAt: true, durationMinutes: true, status: true },
  });
  if (!appt || appt.status !== "confirmed" || sessionPhase(appt.scheduledAt, appt.durationMinutes) !== "open") return null;
  if (appt.patientId === userId) return "patient";
  if (appt.therapistId === userId) return "therapist";
  return null;
}
