'use server'

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { rateLimit, retryAfterMessage } from "@/lib/rateLimit";
import { changePasswordSchema } from "@/lib/validators/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createVerificationToken, invalidatePendingTokens } from "@/lib/tokens";
import { sendEmailChangeConfirmationEmail, sendEmailChangeNoticeEmail } from "@/lib/email";

export type ChangePasswordState = { error?: string };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);

  // Une session volée ne doit pas pouvoir tester des mots de passe à la chaîne.
  const limit = rateLimit(`change-password:${userId}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return { error: retryAfterMessage(limit.retryAfterMs) };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { error: errors.password?.[0] ?? errors.confirmPassword?.[0] ?? "Formulaire invalide." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: userId },
    // passwordChangedAt invalide toutes les sessions, y compris celle-ci (voir auth.ts).
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  await logAudit({
    actor: { id: userId, email: session.user.email ?? undefined },
    action: "account.password_change",
    targetType: "user",
    targetId: userId,
  });

  await signOut({ redirectTo: "/login?passwordChanged=1" });
  return {};
}

export type ChangeEmailState = { error?: string; sentTo?: string };

const newEmailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(180, "Adresse trop longue.");

/** Nom à utiliser dans les e-mails : pseudo du patient ou prénom du praticien. */
async function displayName(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true } } },
  });
  return user?.patientProfile?.nickname ?? user?.therapistProfile?.firstName ?? "Bonjour";
}

/**
 * Demande de changement d'adresse : exige le mot de passe actuel, puis envoie
 * un lien à la NOUVELLE adresse. Rien ne change tant qu'il n'est pas cliqué
 * (confirmEmailChange) ; l'ancienne adresse est prévenue dès la demande.
 */
export async function requestEmailChangeAction(_prev: ChangeEmailState, formData: FormData): Promise<ChangeEmailState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);

  const limit = rateLimit(`change-email:${userId}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: retryAfterMessage(limit.retryAfterMs) };

  const parsed = newEmailSchema.safeParse(formData.get("newEmail"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide." };
  const newEmail = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true } });
  if (!user || !(await bcrypt.compare(String(formData.get("currentPassword") ?? ""), user.passwordHash))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  if (newEmail === user.email.toLowerCase()) return { error: "C'est déjà l'adresse de votre compte." };
  if (await prisma.user.findFirst({ where: { email: newEmail, id: { not: userId } }, select: { id: true } })) {
    return { error: "Cette adresse est déjà utilisée par un autre compte." };
  }

  await prisma.user.update({ where: { id: userId }, data: { pendingEmail: newEmail } });
  await invalidatePendingTokens(userId, "email_change");
  const token = await createVerificationToken(userId, "email_change");
  const name = await displayName(userId);

  try {
    await sendEmailChangeConfirmationEmail(newEmail, name, token);
  } catch (err) {
    console.error("[compte] e-mail de confirmation non envoyé:", err instanceof Error ? err.message : err);
    return { error: "L'e-mail de confirmation n'a pas pu être envoyé. Réessayez dans un instant." };
  }
  await sendEmailChangeNoticeEmail(user.email, name, newEmail, false).catch((err) =>
    console.error("[compte] alerte à l'ancienne adresse non envoyée:", err instanceof Error ? err.message : err)
  );

  await logAudit({
    actor: { id: userId, email: user.email },
    action: "account.email_change_request",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/compte");
  revalidatePath("/admin/compte");
  return { sentTo: newEmail };
}

/** Annule une demande en cours : le lien envoyé ne fonctionne plus. */
export async function cancelEmailChangeAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = Number(session.user.id);
  await prisma.user.update({ where: { id: userId }, data: { pendingEmail: null } });
  await invalidatePendingTokens(userId, "email_change");
  const role = session.user.role;
  redirect(role === "admin" || role === "moderator" ? "/admin/compte" : "/compte");
}
