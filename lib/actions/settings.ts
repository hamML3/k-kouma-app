'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { sendCommissionTermsChangedEmail } from "@/lib/email";

async function requireAdmin(): Promise<{ id: number; email: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    throw new Error("Accès refusé : réservé aux administrateurs.");
  }
  return { id: Number(session.user.id), email: session.user.email };
}

/**
 * Change le pourcentage de commission par défaut de la plateforme. Chaque
 * thérapeute sans commission personnalisée devra re-accepter les
 * conditions — on les prévient par email tout de suite (ils la reverront
 * de toute façon à leur prochaine connexion).
 */
export async function updatePlatformSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const raw = (formData.get("defaultCommissionPercent") as string)?.trim();
  const percent = Number(raw);
  if (!raw || isNaN(percent) || percent < 0 || percent > 100) {
    redirect("/admin/settings?error=invalid");
  }

  const affectedTherapists = await prisma.therapistProfile.findMany({
    where: { commissionPercent: null, isVerified: true },
    select: {
      commissionAcceptedPercent: true,
      firstName: true,
      user: { select: { email: true } },
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, defaultCommissionPercent: percent, updatedById: admin.id },
    update: { defaultCommissionPercent: percent, updatedById: admin.id },
  });

  await logAudit({
    actor: admin,
    action: "admin.settings.commission_default_update",
    metadata: { defaultCommissionPercent: percent },
  });

  await Promise.all(
    affectedTherapists
      .filter((t) => t.commissionAcceptedPercent == null || Number(t.commissionAcceptedPercent) !== percent)
      .map((t) =>
        sendCommissionTermsChangedEmail(t.user.email, t.firstName, percent).catch((err) =>
          console.error("[notify:commission.changed] envoi échoué:", err)
        )
      )
  );

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
