import { createHash, timingSafeEqual } from "crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Sans secret configuré, la route reste fermée. Les empreintes ont la même
 * longueur quel que soit l'en-tête reçu : timingSafeEqual les compare sans
 * révéler le secret par le temps de réponse.
 */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return timingSafeEqual(digest(authorization ?? ""), digest(`Bearer ${secret}`));
}
