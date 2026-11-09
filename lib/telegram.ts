import { after } from "next/server";

/**
 * Alertes Telegram de l'équipe : un message court dans le groupe du staff
 * quand un événement attend une action (paiement à vérifier, candidature…).
 *
 * Telegram est un tiers : rien n'y part qui relève de la santé, du contenu
 * d'un signalement, d'un texte libre écrit par un patient ou de l'identité
 * d'un patient. Chaque type d'événement a son message dédié, construit
 * uniquement à partir des champs listés dans STAFF_ALERTS ; tout type absent
 * de cette liste blanche n'envoie rien.
 *
 * Comme PayDunya et Resend, tout est facultatif : sans TELEGRAM_BOT_TOKEN ni
 * TELEGRAM_CHAT_ID, chaque appel est un no-op silencieux. Aucune fonction de
 * ce module ne lève d'exception vers l'appelant, et le jeton n'est jamais
 * écrit dans les journaux (il fait partie de l'URL de l'API).
 */

const TELEGRAM_TIMEOUT_MS = 5_000;
const MAX_MESSAGE_LENGTH = 4_096;

const TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
const CHAT_ID_PATTERN = /^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})$/;

/** Les références Orange Money ressemblent à « PP231109.1234.A12345 ». */
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._-]{4,40}$/;

type TelegramConfig = { token: string; chatId: string };

export type TelegramStatus =
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "configured"; chatIdHint: string };

function readConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  // Un jeton mal formé (barre oblique, point d'interrogation…) changerait
  // l'URL appelée : on le traite comme une absence de configuration.
  if (!TOKEN_PATTERN.test(token) || !CHAT_ID_PATTERN.test(chatId)) return null;
  return { token, chatId };
}

/** État affiché dans /admin/settings : jamais le jeton, seulement la fin du chat id. */
export function telegramStatus(): TelegramStatus {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { state: "missing" };
  const config = readConfig();
  if (!config) return { state: "invalid" };
  return { state: "configured", chatIdHint: `…${config.chatId.slice(-4)}` };
}

/** parse_mode HTML : &, < et > doivent être échappés hors balises ; " l'est aussi pour les attributs. */
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Lien absolu vers une page d'administration, construit depuis NEXTAUTH_URL ; null sinon. */
export function adminUrl(path: string | undefined): string | null {
  if (!path || !(path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?"))) return null;
  if (path.includes("\\") || path.includes("//")) return null;
  const base = process.env.NEXTAUTH_URL;
  if (!base) return null;
  try {
    const origin = new URL(base);
    if (origin.protocol !== "https:" && origin.protocol !== "http:") return null;
    const url = new URL(path, origin);
    return url.origin === origin.origin ? url.toString() : null;
  } catch {
    return null;
  }
}

function redact(text: string, token: string): string {
  return text.split(token).join("***");
}

/**
 * Envoie un message (déjà au format HTML Telegram) au chat de l'équipe.
 * Renvoie true si Telegram l'a accepté, false sinon — sans jamais lever.
 */
export async function sendTelegramMessage(html: string): Promise<boolean> {
  const config = readConfig();
  if (!config) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: html.slice(0, MAX_MESSAGE_LENGTH),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res
        .json()
        .then((data: { description?: unknown }) => (typeof data?.description === "string" ? data.description : ""))
        .catch(() => "");
      console.error(`[telegram] envoi refusé (HTTP ${res.status}) ${redact(detail, config.token).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    // Ni l'objet d'erreur brut ni l'URL : seulement le nom et un message expurgé.
    const name = err instanceof Error ? err.name : "Erreur";
    const message = err instanceof Error ? redact(err.message, config.token).slice(0, 200) : "";
    console.error(`[telegram] envoi échoué : ${name} ${message}`);
    return false;
  }
}

/**
 * Faits non sensibles qu'un appelant de notifyStaff/notifyAdmins peut
 * fournir pour l'alerte Telegram. Chaque formateur ci-dessous n'en lit que
 * ceux qui le concernent.
 */
export type StaffAlertFacts = {
  amount?: number;
  currency?: string;
  /** Référence de transaction : n'est envoyée que si elle a la forme d'un identifiant (saisie par le patient). */
  reference?: string;
  articleTitle?: string;
};

type StaffAlertInput = { type: string; link?: string; alert?: StaffAlertFacts };

type StaffAlertSpec = { title: string; lines: (facts: StaffAlertFacts) => string[]; linkLabel: string };

function formatAmount(facts: StaffAlertFacts): string | null {
  if (typeof facts.amount !== "number" || !Number.isFinite(facts.amount)) return null;
  const currency = facts.currency && /^[A-Z]{3}$/.test(facts.currency) ? facts.currency : "XOF";
  return `${facts.amount.toLocaleString("fr-FR")} ${currency}`;
}

function amountLine(facts: StaffAlertFacts): string[] {
  const amount = formatAmount(facts);
  return amount ? [`Montant : ${escapeTelegramHtml(amount)}`] : [];
}

/** Liste blanche : un type absent d'ici n'est jamais envoyé à Telegram. */
const STAFF_ALERTS: Record<string, StaffAlertSpec> = {
  "payment.declared": {
    title: "Paiement Orange Money à vérifier",
    lines: (facts) => {
      const lines = amountLine(facts);
      const reference = facts.reference?.trim();
      if (reference && SAFE_REFERENCE_PATTERN.test(reference)) {
        lines.push(`Référence : <code>${escapeTelegramHtml(reference)}</code>`);
      }
      return lines;
    },
    linkLabel: "Ouvrir les finances",
  },
  "payout_request.created": {
    title: "Demande de retrait d'un praticien",
    lines: amountLine,
    linkLabel: "Ouvrir les finances",
  },
  "therapist.registered": {
    title: "Nouvelle candidature de praticien",
    lines: () => ["Dossier et justificatifs à vérifier."],
    linkLabel: "Voir la candidature",
  },
  "article.proposed": {
    title: "Article proposé à relire",
    lines: (facts) => {
      const title = facts.articleTitle?.replace(/\s+/g, " ").trim();
      if (!title) return [];
      const short = title.length > 120 ? `${title.slice(0, 119)}…` : title;
      return [`« ${escapeTelegramHtml(short)} »`];
    },
    linkLabel: "Ouvrir les articles",
  },
  "review.submitted": {
    title: "Nouvel avis à modérer",
    lines: () => [],
    linkLabel: "Ouvrir les avis",
  },
  "report.filed": {
    title: "Nouveau signalement à examiner",
    lines: () => [],
    linkLabel: "Ouvrir les signalements",
  },
};

/** Le texte HTML de l'alerte, ou null si ce type n'est pas dans la liste blanche. */
export function staffAlertMessage(input: StaffAlertInput): string | null {
  if (!Object.hasOwn(STAFF_ALERTS, input.type)) return null;
  const spec = STAFF_ALERTS[input.type];
  const parts = [`<b>K-Kouma · ${escapeTelegramHtml(spec.title)}</b>`, ...spec.lines(input.alert ?? {})];
  const url = adminUrl(input.link);
  if (url) parts.push(`<a href="${escapeTelegramHtml(url)}">${escapeTelegramHtml(spec.linkLabel)}</a>`);
  return parts.join("\n");
}

/** Envoie l'alerte d'un événement staff si son type est dans la liste blanche. */
export async function sendStaffAlert(input: StaffAlertInput): Promise<boolean> {
  try {
    const message = staffAlertMessage(input);
    if (!message) return false;
    return await sendTelegramMessage(message);
  } catch (err) {
    console.error(`[telegram:${input.type}] alerte non construite:`, err instanceof Error ? err.name : err);
    return false;
  }
}

/** Message du bouton « Envoyer un message de test » de /admin/settings. */
export async function sendTelegramTestMessage(): Promise<boolean> {
  const url = adminUrl("/admin/settings");
  const parts = [
    "<b>K-Kouma · Message de test</b>",
    "Les alertes Telegram de l'équipe fonctionnent.",
  ];
  if (url) parts.push(`<a href="${escapeTelegramHtml(url)}">Ouvrir les réglages</a>`);
  return sendTelegramMessage(parts.join("\n"));
}

/**
 * Planifie l'alerte après la réponse (after() de Next.js) : l'action de
 * l'utilisateur n'attend jamais Telegram. Hors requête (script, test),
 * after() lève : l'envoi part alors en tâche de fond, ce qui suffit sur un
 * serveur Node permanent (un seul process PM2).
 */
export function scheduleStaffAlert(input: StaffAlertInput): void {
  if (!readConfig() || !Object.hasOwn(STAFF_ALERTS, input.type)) return;
  const snapshot: StaffAlertInput = { type: input.type, link: input.link, alert: input.alert && { ...input.alert } };
  try {
    after(() => sendStaffAlert(snapshot));
  } catch {
    void sendStaffAlert(snapshot);
  }
}
