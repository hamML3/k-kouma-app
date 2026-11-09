import { EMERGENCY_TEXT } from "@/lib/emergency";

type Named = {
  id: number;
  email?: string;
  patientProfile?: { nickname: string | null } | null;
  therapistProfile?: { firstName: string; lastName: string } | null;
} | null;

export function personName(user: Named): string {
  if (!user) return "—";
  if (user.therapistProfile) return `${user.therapistProfile.firstName} ${user.therapistProfile.lastName}`.trim();
  return user.patientProfile?.nickname ?? user.email ?? "—";
}

export const EMERGENCY_NOTICE = `Cette messagerie n'est pas un service d'urgence : votre interlocuteur répond dès qu'il le peut. En cas de danger immédiat, appelez ${EMERGENCY_TEXT}.`;
