'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { resolveRecipients, scheduleCampaign, sendCampaignTest, type CampaignAudience } from "@/lib/campaigns";
import type { CampaignContent } from "@/lib/email";

export type CampaignState = { error?: string; message?: string };

async function requireAdmin(): Promise<{ id: number; email: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) throw new Error("Accès refusé : réservé aux administrateurs.");
  return { id: Number(session.user.id), email: session.user.email };
}

const contentSchema = z
  .object({
    subject: z.string().trim().min(3, "Objet trop court.").max(200, "Objet trop long (200 caractères au maximum)."),
    body: z.string().trim().min(10, "Message trop court.").max(20000, "Message trop long."),
    category: z.enum(["promotion", "information"]),
    buttonLabel: z.string().trim().max(60, "Texte du bouton trop long.").optional(),
    buttonUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Le lien du bouton doit commencer par https://"),
  })
  .refine((d) => Boolean(d.buttonLabel) === Boolean(d.buttonUrl), "Pour ajouter un bouton, remplissez son texte et son lien.");

function readContent(formData: FormData): { content?: CampaignContent; error?: string } {
  const parsed = contentSchema.safeParse({
    subject: formData.get("subject") ?? "",
    body: formData.get("body") ?? "",
    category: formData.get("category"),
    buttonLabel: (formData.get("buttonLabel") as string) || undefined,
    buttonUrl: (formData.get("buttonUrl") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  return { content: { ...parsed.data, buttonLabel: parsed.data.buttonLabel ?? null, buttonUrl: parsed.data.buttonUrl ?? null } };
}

function readAudience(formData: FormData): CampaignAudience | null {
  if (formData.get("audienceMode") === "people") {
    const userIds = String(formData.get("userIds") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 5000);
    return userIds.length ? { mode: "people", userIds } : null;
  }
  const roles = formData.getAll("roles").filter((r): r is "patient" | "therapist" => r === "patient" || r === "therapist");
  return roles.length ? { mode: "groups", roles, verifiedOnly: formData.get("verifiedOnly") === "on" } : null;
}

/** Envoie le message à l'adresse de l'admin connecté, pour le relire avant l'envoi réel. */
export async function sendCampaignTestAction(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  let admin: { id: number; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Accès refusé." };
  }
  const { content, error } = readContent(formData);
  if (!content) return { error };
  try {
    await sendCampaignTest(content, { id: admin.id, email: admin.email, name: "Admin" });
  } catch (err) {
    console.error("[campagne] essai non envoyé:", err instanceof Error ? err.message : err);
    return { error: "L'e-mail d'essai n'a pas pu partir. Vérifiez la configuration de Resend." };
  }
  return { message: `E-mail d'essai envoyé à ${admin.email}.` };
}

/** Envoi réel : la liste des destinataires est recalculée ici, côté serveur, jamais reprise du navigateur. */
export async function sendCampaignAction(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  let admin: { id: number; email: string };
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Accès refusé." };
  }
  const { content, error } = readContent(formData);
  if (!content) return { error };
  const audience = readAudience(formData);
  if (!audience) return { error: "Choisissez au moins un groupe ou une personne." };

  const { recipients, skippedOptOut } = await resolveRecipients(audience, content.category);
  if (recipients.length === 0) {
    return { error: skippedOptOut ? "Toutes les personnes choisies se sont désinscrites des promotions." : "Aucun destinataire ne correspond à cette sélection." };
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject: content.subject,
      body: content.body,
      category: content.category,
      buttonLabel: content.buttonLabel,
      buttonUrl: content.buttonUrl,
      audience,
      recipientCount: recipients.length,
      skippedOptOut,
      createdById: admin.id,
    },
    select: { id: true },
  });
  await logAudit({
    actor: admin,
    action: "admin.email_campaign.send",
    targetType: "email_campaign",
    targetId: campaign.id,
    metadata: { subject: content.subject, category: content.category, recipients: recipients.length, skippedOptOut },
  });
  scheduleCampaign(campaign.id, content, recipients);

  revalidatePath("/admin/emails");
  return {
    message: `Envoi lancé vers ${recipients.length} personne${recipients.length > 1 ? "s" : ""}${
      skippedOptOut ? ` (${skippedOptOut} désinscrite${skippedOptOut > 1 ? "s" : ""} écartée${skippedOptOut > 1 ? "s" : ""})` : ""
    }. Le suivi s'affiche dans l'historique ci-dessous.`,
  };
}
