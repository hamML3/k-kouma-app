'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createUserSchema } from "@/lib/validators/admin";
import { logAudit } from "@/lib/audit";
import { effectiveCommissionPercent, needsCommissionAcceptance } from "@/lib/commission";
import { sendCommissionTermsChangedEmail, sendTherapistVerifiedEmail } from "@/lib/email";
import { PERMISSIONS, type Permission, hasPermission, canActOnRole } from "@/lib/permissions";
import { markTherapistEarningsPaid } from "@/lib/payouts";
import { completePendingPayment } from "@/lib/payments";
import { createNotification } from "@/lib/notifications";

export type CreateUserState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

// Le middleware (proxy.ts) laisse volontairement passer les Server Actions
// sans vérifier la session — chaque action admin doit donc faire ce contrôle
// elle-même avant toute lecture/écriture sensible. Retourne l'identité de
// l'admin, réutilisée pour le journal d'audit.
async function requireAdmin(): Promise<{ id: number; email: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    throw new Error("Accès refusé : réservé aux administrateurs.");
  }
  return { id: Number(session.user.id), email: session.user.email };
}

/**
 * Accès admin restreint ("modérateur") : autorisé seulement si la permission
 * demandée a été explicitement accordée à ce compte (lib/permissions.ts) —
 * un admin passe toujours, implicitement. Remplace le jeu de capacités fixe
 * qu'avait autrefois requireAdminOrModerator() par un ensemble configurable
 * par compte modérateur.
 */
async function requirePermission(permission: Permission): Promise<{ id: number; email: string; role: string }> {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, permission)) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email, role: session.user.role };
}

/**
 * Historiquement : actions financières (valider/rejeter un paiement,
 * marquer un reversement). Conservé comme alias pour ne pas changer les
 * trois call sites existants — correspond désormais à la permission
 * `manage_finances`, accordée par défaut aux modérateurs existants (voir
 * prisma/seed.ts et prisma/backfill-moderator-permissions.ts).
 */
async function requireAdminOrModerator(): Promise<{ id: number; email: string; role: string }> {
  return requirePermission("manage_finances");
}

/** Création directe d'un compte par un admin (patient, thérapeute ou autre admin) — sans passer par l'inscription publique. */
export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  let admin: { id: number; email: string; role: string };
  try {
    admin = await requirePermission("manage_users");
  } catch {
    return { error: "Accès refusé." };
  }

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    nickname: (formData.get("nickname") as string) || undefined,
    firstName: (formData.get("firstName") as string) || undefined,
    lastName: (formData.get("lastName") as string) || undefined,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, role, nickname, firstName, lastName } = parsed.data;

  // Un modérateur titulaire de manage_users ne peut pas créer de nouveau
  // compte admin ou modérateur — seul un véritable admin le peut
  // (anti-élévation de privilège).
  if (!canActOnRole(admin.role, role)) {
    return { error: "Accès refusé : seul un administrateur peut créer un compte admin ou modérateur." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte avec cet email existe déjà." };

  const passwordHash = await bcrypt.hash(password, 12);

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      status: "active",
      emailVerifiedAt: new Date(), // créé par un admin — pas besoin de revérifier l'email
      ...(role === "patient" && {
        patientProfile: { create: { nickname: nickname!, timezone: "Africa/Bamako" } },
      }),
      ...(role === "therapist" && {
        therapistProfile: {
          create: { firstName: firstName!, lastName: lastName!, isVerified: true },
        },
      }),
    },
  });

  await logAudit({
    actor: admin,
    action: "admin.user.create",
    targetType: "user",
    targetId: created.id,
    metadata: { email, role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function suspendUserAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_users");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  // Un modérateur ne peut jamais suspendre un compte admin ou modérateur,
  // même s'il détient manage_users (anti-sabotage d'un compte à privilèges
  // égaux ou supérieurs).
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || !canActOnRole(admin.role, target.role)) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "suspended" } });
  await logAudit({ actor: admin, action: "admin.user.suspend", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function reactivateUserAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_users");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || !canActOnRole(admin.role, target.role)) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "active" } });
  await logAudit({ actor: admin, action: "admin.user.reactivate", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/**
 * Accorde/retire les permissions d'un compte modérateur — action
 * volontairement réservée au véritable admin (requireAdmin), jamais
 * délégable : pouvoir accorder des permissions est en soi un pouvoir plus
 * élevé que n'importe laquelle des permissions qu'il distribue.
 */
export async function updateModeratorPermissionsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || target.role !== "moderator") redirect("/admin/users");

  const granted = PERMISSIONS.filter((p) => formData.get(p) === "on");

  await prisma.user.update({ where: { id: userId }, data: { permissions: granted } });
  await logAudit({
    actor: admin,
    action: "admin.user.permissions_update",
    targetType: "user",
    targetId: userId,
    metadata: { permissions: granted },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function suspendUser(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_therapists");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || !canActOnRole(admin.role, target.role)) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });
  await logAudit({ actor: admin, action: "admin.therapist.suspend", targetType: "user", targetId: userId });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function unsuspendUser(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_therapists");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || !canActOnRole(admin.role, target.role)) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  });
  await logAudit({ actor: admin, action: "admin.therapist.unsuspend", targetType: "user", targetId: userId });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function verifyTherapist(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_therapists");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  const [therapist, settings] = await Promise.all([
    prisma.therapistProfile.update({
      where: { userId },
      data: { isVerified: true, rejectedAt: null },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);
  await logAudit({ actor: admin, action: "admin.therapist.verify", targetType: "user", targetId: userId });
  await createNotification({
    userId,
    type: "therapist.verified",
    title: "Votre compte est vérifié",
    body: "Acceptez les conditions de commission pour recevoir vos premiers patients.",
    link: "/dashboard",
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    const effective = effectiveCommissionPercent(
      therapist.commissionPercent ? Number(therapist.commissionPercent) : null,
      Number(settings?.defaultCommissionPercent ?? 20)
    );
    try {
      await sendTherapistVerifiedEmail(user.email, therapist.firstName, effective);
    } catch (err) {
      console.error("[notify:therapist.verified] envoi échoué:", err);
    }
  }

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}

export async function rejectTherapist(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_therapists");
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { rejectedAt: new Date(), isVerified: false },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });
  await logAudit({ actor: admin, action: "admin.therapist.reject", targetType: "user", targetId: userId });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}

/** Valide une déclaration de paiement Orange Money manuel : crédite les séances et clôt le paiement, ensemble. */
export async function confirmManualPaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) redirect("/admin/finances");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "pending") redirect("/admin/finances");

  if (!(await completePendingPayment(payment))) redirect("/admin/finances");

  await logAudit({
    actor: admin,
    action: "admin.payment.confirm",
    targetType: "payment",
    targetId: paymentId,
    metadata: { amount: Number(payment.amount), sessionsCount: payment.sessionsCount, provider: payment.provider },
  });

  await createNotification({
    userId: payment.patientId,
    type: "payment.confirmed",
    title: "Paiement validé",
    body: `${payment.sessionsCount} séance${payment.sessionsCount > 1 ? "s" : ""} ajoutée${payment.sessionsCount > 1 ? "s" : ""} à votre compte.`,
    link: "/subscription",
  });

  revalidatePath("/admin/finances");
  redirect("/admin/finances");
}

/** Rejette une déclaration de paiement Orange Money manuel (référence introuvable, montant incorrect…). */
export async function rejectManualPaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) redirect("/admin/finances");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { patientId: true } });

  const { count } = await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "failed" },
  });

  await logAudit({ actor: admin, action: "admin.payment.reject", targetType: "payment", targetId: paymentId });

  if (count > 0 && payment) {
    await createNotification({
      userId: payment.patientId,
      type: "payment.rejected",
      title: "Paiement non validé",
      body: "Nous n'avons pas pu vérifier votre déclaration. Vérifiez la référence ou contactez-nous.",
      link: "/subscription",
    });
  }

  revalidatePath("/admin/finances");
  redirect("/admin/finances");
}

/**
 * Définit (ou retire, si `percent` est vide) la commission propre à un
 * thérapeute, qui prévaut alors sur le défaut de la plateforme. S'il doit
 * à nouveau accepter des conditions suite à ce changement, on le prévient
 * par email (il verra aussi la demande d'acceptation à sa prochaine connexion).
 */
export async function updateTherapistCommissionAction(formData: FormData): Promise<void> {
  const admin = await requirePermission("manage_therapists");
  const therapistId = Number(formData.get("therapistId"));
  if (!therapistId) redirect("/admin/therapists");

  const raw = (formData.get("commissionPercent") as string)?.trim();
  const percent = raw ? Number(raw) : null;
  if (raw && (isNaN(percent!) || percent! < 0 || percent! > 100)) {
    redirect(`/admin/therapists/${therapistId}?error=commission`);
  }

  const [therapist, settings] = await Promise.all([
    prisma.therapistProfile.findUnique({
      where: { userId: therapistId },
      select: { commissionAcceptedPercent: true },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);

  await prisma.therapistProfile.update({
    where: { userId: therapistId },
    data: { commissionPercent: percent },
  });

  await logAudit({
    actor: admin,
    action: "admin.therapist.commission_update",
    targetType: "user",
    targetId: therapistId,
    metadata: { commissionPercent: percent },
  });

  const effective = effectiveCommissionPercent(percent, Number(settings?.defaultCommissionPercent ?? 20));
  if (needsCommissionAcceptance(effective, therapist?.commissionAcceptedPercent ? Number(therapist.commissionAcceptedPercent) : null)) {
    await createNotification({
      userId: therapistId,
      type: "commission.changed",
      title: "Nouvelles conditions de commission",
      body: `La commission passe à ${effective} %. Merci de l'accepter pour continuer à recevoir des patients.`,
      link: "/dashboard",
    });
    const user = await prisma.user.findUnique({
      where: { id: therapistId },
      select: { email: true, therapistProfile: { select: { firstName: true } } },
    });
    if (user?.therapistProfile) {
      try {
        await sendCommissionTermsChangedEmail(user.email, user.therapistProfile.firstName, effective);
      } catch (err) {
        console.error("[notify:commission.changed] envoi échoué:", err);
      }
    }
  }

  revalidatePath(`/admin/therapists/${therapistId}`);
  redirect(`/admin/therapists/${therapistId}`);
}

/** Marque tous les gains non reversés d'un thérapeute comme payés, en une fois. */
export async function markTherapistPayoutAction(formData: FormData): Promise<void> {
  const admin = await requireAdminOrModerator();
  const therapistId = Number(formData.get("therapistId"));
  if (!therapistId) redirect("/admin/finances");

  const result = await markTherapistEarningsPaid(therapistId);

  await logAudit({
    actor: admin,
    action: "admin.payout.mark_paid",
    targetType: "user",
    targetId: therapistId,
    metadata: { earningsCount: result.count },
  });

  if (result.count > 0) {
    await createNotification({
      userId: therapistId,
      type: "payout.paid",
      title: "Reversement effectué",
      body: "Vos gains ont été marqués comme reversés.",
      link: "/earnings",
    });
  }

  revalidatePath("/admin/finances");
  redirect("/admin/finances");
}
