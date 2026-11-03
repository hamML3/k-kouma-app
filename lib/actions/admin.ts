'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createUserSchema } from "@/lib/validators/admin";
import { logAudit } from "@/lib/audit";

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

/** Création directe d'un compte par un admin (patient, thérapeute ou autre admin) — sans passer par l'inscription publique. */
export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  let admin: { id: number; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Accès refusé : réservé aux administrateurs." };
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
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "suspended" } });
  await logAudit({ actor: admin, action: "admin.user.suspend", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function reactivateUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "active" } });
  await logAudit({ actor: admin, action: "admin.user.reactivate", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function suspendUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

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
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

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
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { isVerified: true, rejectedAt: null },
  });
  await logAudit({ actor: admin, action: "admin.therapist.verify", targetType: "user", targetId: userId });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}

export async function rejectTherapist(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
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
  const admin = await requireAdmin();
  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) redirect("/admin/finances");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "pending") redirect("/admin/finances");

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "completed", paidAt: new Date() },
    }),
    prisma.patientProfile.updateMany({
      where: { userId: payment.patientId },
      data: { sessionCredits: { increment: payment.sessionsCount } },
    }),
  ]);

  await logAudit({
    actor: admin,
    action: "admin.payment.confirm",
    targetType: "payment",
    targetId: paymentId,
    metadata: { amount: Number(payment.amount), sessionsCount: payment.sessionsCount, provider: payment.provider },
  });

  revalidatePath("/admin/finances");
  redirect("/admin/finances");
}

/** Rejette une déclaration de paiement Orange Money manuel (référence introuvable, montant incorrect…). */
export async function rejectManualPaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const paymentId = Number(formData.get("paymentId"));
  if (!paymentId) redirect("/admin/finances");

  await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "failed" },
  });

  await logAudit({ actor: admin, action: "admin.payment.reject", targetType: "payment", targetId: paymentId });

  revalidatePath("/admin/finances");
  redirect("/admin/finances");
}
