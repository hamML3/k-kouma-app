import type { Session } from "next-auth";
import type { Viewer } from "@/lib/conversations";

/** Identité de l'utilisateur connecté pour la messagerie, tirée de la session seule. */
export function viewerFromSession(session: Session | null): Viewer | null {
  if (!session?.user?.id) return null;
  return { id: Number(session.user.id), role: session.user.role, permissions: session.user.permissions };
}
