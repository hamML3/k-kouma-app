import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Purge périodique des compteurs expirés — évite une fuite mémoire sur un
// process long-running. Démarré une seule fois par process.
let cleanupStarted = false;
function ensureCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, 10 * 60 * 1000).unref();
}

/**
 * Limiteur de débit en mémoire (process unique, mode PM2 "fork") — suffisant
 * tant que l'app ne tourne pas en cluster multi-instance. À remplacer par un
 * store partagé (Redis) si ça change un jour.
 *
 * `key` doit déjà inclure le contexte (ex. "login:email@x.com").
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  ensureCleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** IP du client déduite des headers de proxy — "unknown" si indisponible (dev local, proxy mal configuré). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export function retryAfterMessage(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60000);
  return minutes <= 1
    ? "Trop de tentatives. Réessayez dans une minute."
    : `Trop de tentatives. Réessayez dans ${minutes} minutes.`;
}
