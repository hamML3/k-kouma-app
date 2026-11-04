'use server'

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { rateLimit, retryAfterMessage } from "@/lib/rateLimit";
import { changePasswordSchema } from "@/lib/validators/auth";

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
