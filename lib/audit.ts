import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rateLimit";
import type { Prisma } from "@prisma/client";

export type AuditActor = { id: number; email?: string } | null;

/**
 * Enregistre une action sensible dans le journal d'audit. N'échoue jamais
 * l'appelant — une panne du journal ne doit pas bloquer l'action réelle
 * (même logique que l'envoi d'email : on log l'erreur et on continue).
 */
export async function logAudit(params: {
  actor: AuditActor;
  action: string;
  targetType?: string;
  targetId?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    const ip = await clientIp().catch(() => null);
    await prisma.auditLog.create({
      data: {
        actorId: params.actor?.id ?? null,
        actorEmail: params.actor?.email ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] écriture échouée:", err);
  }
}
