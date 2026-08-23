import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { VerificationTokenType } from "@prisma/client";

const TTL_MS: Record<VerificationTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, // 1h
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Crée un token à usage unique pour l'utilisateur donné et retourne la valeur
 * brute (à envoyer par email — seul son hash est stocké en base).
 */
export async function createVerificationToken(
  userId: number,
  type: VerificationTokenType
): Promise<string> {
  const raw = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    },
  });

  return raw;
}

type ConsumeResult =
  | { ok: true; userId: number }
  // "used" et "expired" incluent l'utilisateur concerné : utile pour distinguer
  // un lien déjà validé avec succès (revisité) d'un token réellement invalide.
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "used" | "expired"; userId: number };

/**
 * Valide un token brut reçu (lien cliqué) : vérifie qu'il existe, n'est ni
 * expiré ni déjà utilisé, puis le marque comme utilisé (usage unique).
 */
export async function consumeVerificationToken(
  raw: string,
  type: VerificationTokenType
): Promise<ConsumeResult> {
  const tokenHash = hashToken(raw);

  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash },
  });

  if (!token || token.type !== type) {
    return { ok: false, reason: "invalid" };
  }
  if (token.usedAt) {
    return { ok: false, reason: "used", userId: token.userId };
  }
  if (token.expiresAt < new Date()) {
    return { ok: false, reason: "expired", userId: token.userId };
  }

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: token.userId };
}

/** Invalide les tokens en attente d'un type donné (avant d'en émettre un nouveau). */
export async function invalidatePendingTokens(
  userId: number,
  type: VerificationTokenType
): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
}
