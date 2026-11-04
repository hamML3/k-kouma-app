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
  redirect("/admin/settings?saved=commission");
}

/**
 * Bannière globale (annonce) affichée en haut du site, public et espace
 * connecté — voir components/PlatformBanner.tsx. Lue à chaque requête (aucun
 * cache à invalider) : l'effet est immédiat.
 */
export async function updateAnnouncementSettingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const active = formData.get("announcementActive") === "on";
  const rawText = (formData.get("announcementText") as string | null)?.trim() ?? "";
  const announcementText = rawText.length > 0 ? rawText : null;

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, announcementActive: active, announcementText, updatedById: admin.id },
    update: { announcementActive: active, announcementText, updatedById: admin.id },
  });

  await logAudit({
    actor: admin,
    action: "admin.settings.announcement_update",
    metadata: { announcementActive: active, announcementText },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=announcement");
}

/**
 * Mode maintenance : affiche un bandeau d'avertissement sur tout le site et
 * bloque les nouveaux achats de séances (lib/actions/payments.ts). Ne touche
 * jamais /admin — un admin peut toujours revenir ici pour le désactiver.
 */
export async function updateMaintenanceModeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const maintenanceModeEnabled = formData.get("maintenanceModeEnabled") === "on";

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, maintenanceModeEnabled, updatedById: admin.id },
    update: { maintenanceModeEnabled, updatedById: admin.id },
  });

  await logAudit({
    actor: admin,
    action: "admin.settings.maintenance_mode_update",
    metadata: { maintenanceModeEnabled },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=maintenance");
}

/** Mention fiscale des factures : à fixer avec le comptable, jamais déduite par l'application. */
export async function updateInvoiceSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const invoiceTaxNote = ((formData.get("invoiceTaxNote") as string) ?? "").trim().slice(0, 255) || null;

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, invoiceTaxNote, updatedById: admin.id },
    update: { invoiceTaxNote, updatedById: admin.id },
  });

  await logAudit({
    actor: admin,
    action: "admin.settings.invoice_update",
    metadata: { invoiceTaxNote },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=invoice");
}

/**
 * Bascules de fonctionnalités : paiement manuel Orange Money (lib/orangeMoney.ts)
 * et affichage de la carte "Coach de vie" sur la page d'accueil publique.
 */
export async function updateFeatureTogglesAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const orangeMoneyManualEnabled = formData.get("orangeMoneyManualEnabled") === "on";
  const showLifeCoachCard = formData.get("showLifeCoachCard") === "on";

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: { id: 1, orangeMoneyManualEnabled, showLifeCoachCard, updatedById: admin.id },
    update: { orangeMoneyManualEnabled, showLifeCoachCard, updatedById: admin.id },
  });

  await logAudit({
    actor: admin,
    action: "admin.settings.feature_toggles_update",
    metadata: { orangeMoneyManualEnabled, showLifeCoachCard },
  });

  revalidatePath("/admin/settings");
  // La page d'accueil publique est en ISR (revalidate=60) — on force la mise
  // à jour immédiate de la carte "Coach de vie" plutôt que d'attendre.
  revalidatePath("/");
  redirect("/admin/settings?saved=features");
}
