import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";
import { sendEmailChangeNoticeEmail } from "@/lib/email";

export type EmailChangeResult = "success" | "invalid" | "expired" | "taken";

/**
 * Clic sur le lien envoyé à la nouvelle adresse : l'adresse du compte
 * change, elle est marquée vérifiée, et toutes les sessions sont fermées
 * (passwordChangedAt, voir auth.ts) pour se reconnecter avec la nouvelle.
 */
export async function confirmEmailChange(token: string): Promise<EmailChangeResult> {
  const result = await consumeVerificationToken(token, "email_change");
  if (!result.ok) return result.reason === "expired" ? "expired" : "invalid";

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { id: true, email: true, pendingEmail: true, patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true } } },
  });
  if (!user?.pendingEmail) return "invalid";
  const oldEmail = user.email;
  const newEmail = user.pendingEmail;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail, pendingEmail: null, emailVerifiedAt: new Date(), passwordChangedAt: new Date() },
    });
  } catch (err) {
    // Adresse prise entre la demande et la confirmation.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "taken";
    throw err;
  }

  await logAudit({
    actor: { id: user.id, email: newEmail },
    action: "account.email_change",
    targetType: "user",
    targetId: user.id,
    metadata: { from: oldEmail, to: newEmail },
  });
  const name = user.patientProfile?.nickname ?? user.therapistProfile?.firstName ?? "Bonjour";
  await sendEmailChangeNoticeEmail(oldEmail, name, newEmail, true).catch((err) =>
    console.error("[compte] avis de changement non envoyé:", err instanceof Error ? err.message : err)
  );
  return "success";
}
