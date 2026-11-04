import { prisma } from "@/lib/prisma";

export type RoomRole = "patient" | "therapist";

// Le rôle de l'appelant dans cette salle se déduit du rendez-vous, jamais de la
// requête : un participant ne doit pas pouvoir se faire passer pour l'autre.
export async function participantRole(roomId: string, userId: number): Promise<RoomRole | null> {
  const appt = await prisma.appointment.findFirst({
    where: { webrtcRoomId: roomId },
    select: { patientId: true, therapistId: true },
  });
  if (appt?.patientId === userId) return "patient";
  if (appt?.therapistId === userId) return "therapist";
  return null;
}
