import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderCampaignHtml, sendCampaignBatch, type CampaignContent } from "@/lib/email";

const BATCH_SIZE = 100;
const PAUSE_MS = 700; // Resend limite le nombre d'appels par seconde.

/** Sélection faite dans l'administration : des groupes, ou des personnes choisies. */
export type CampaignAudience =
  | { mode: "groups"; roles: ("patient" | "therapist")[]; verifiedOnly: boolean }
  | { mode: "people"; userIds: number[] };

export type Recipient = { id: number; email: string; name: string };

const APP_URL = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function signature(userId: number): string {
  const key = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  return createHmac("sha256", key).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

/** Lien de désinscription propre à chaque personne, signé : il ne permet de désinscrire qu'elle. */
export function unsubscribeUrl(userId: number): string {
  return `${APP_URL()}/desabonnement?u=${userId}&t=${signature(userId)}`;
}

/** Même lien, pour la désinscription « en un clic » des messageries (requête POST, en-tête List-Unsubscribe). */
export function oneClickUnsubscribeUrl(userId: number): string {
  return `${APP_URL()}/api/unsubscribe?u=${userId}&t=${signature(userId)}`;
}

export function isValidUnsubscribe(userId: number, token: string): boolean {
  if (!Number.isInteger(userId) || userId <= 0 || !/^[0-9a-f]{32}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(signature(userId)), Buffer.from(token));
}

export async function unsubscribe(userId: number): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, marketingOptOutAt: null }, data: { marketingOptOutAt: new Date() } });
}

/**
 * Destinataires réels d'un envoi : comptes patients et praticiens actifs, et,
 * pour une promotion, jamais les personnes désinscrites (comptées à part).
 */
export async function resolveRecipients(
  audience: CampaignAudience,
  category: CampaignContent["category"]
): Promise<{ recipients: Recipient[]; skippedOptOut: number }> {
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      role: { in: audience.mode === "groups" ? audience.roles : ["patient", "therapist"] },
      ...(audience.mode === "people" ? { id: { in: audience.userIds } } : {}),
      ...(audience.mode === "groups" && audience.verifiedOnly ? { emailVerifiedAt: { not: null } } : {}),
    },
    select: {
      id: true,
      email: true,
      marketingOptOutAt: true,
      patientProfile: { select: { nickname: true } },
      therapistProfile: { select: { firstName: true } },
    },
  });
  const optedOut = category === "promotion" ? users.filter((u) => u.marketingOptOutAt) : [];
  const recipients = users
    .filter((u) => !(category === "promotion" && u.marketingOptOutAt))
    .map((u) => ({ id: u.id, email: u.email, name: u.patientProfile?.nickname ?? u.therapistProfile?.firstName ?? "Bonjour" }));
  return { recipients, skippedOptOut: optedOut.length };
}

function messageFor(content: CampaignContent, r: Recipient) {
  const promo = content.category === "promotion";
  return {
    to: r.email,
    subject: content.subject,
    html: renderCampaignHtml(content, r.name, promo ? unsubscribeUrl(r.id) : null),
    oneClickUnsubscribeUrl: promo ? oneClickUnsubscribeUrl(r.id) : null,
  };
}

/** Envoi d'un e-mail d'essai à une seule adresse (celle de l'admin). */
export async function sendCampaignTest(content: CampaignContent, recipient: Recipient): Promise<void> {
  await sendCampaignBatch([messageFor({ ...content, subject: `[Essai] ${content.subject}` }, recipient)]);
}

/**
 * Envoi en tâche de fond, par lots : la page de l'admin répond tout de suite
 * et le suivi (envoyés, échecs) se met à jour au fil des lots.
 */
export function scheduleCampaign(campaignId: number, content: CampaignContent, recipients: Recipient[]): void {
  const run = async () => {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      try {
        sent += await sendCampaignBatch(batch.map((r) => messageFor(content, r)));
      } catch (err) {
        failed += batch.length;
        console.error(`[campagne ${campaignId}] lot non envoyé:`, err instanceof Error ? err.message : err);
      }
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { sentCount: sent, failedCount: failed } }).catch(() => {});
      if (i + BATCH_SIZE < recipients.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    await prisma.emailCampaign
      .update({
        where: { id: campaignId },
        data: { status: sent === 0 && failed > 0 ? "failed" : "sent", finishedAt: new Date() },
      })
      .catch(() => {});
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
