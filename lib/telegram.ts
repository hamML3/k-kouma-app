import { after } from "next/server";

/**
 * Alertes Telegram de l'équipe : un message court à chaque membre du staff
 * qui a relié son Telegram (/admin/compte), quand un événement attend une
 * action (paiement à vérifier, candidature…).
 *
 * Telegram est un tiers : rien n'y part qui relève de la santé, du contenu
 * d'un signalement, d'un texte libre écrit par un patient ou de l'identité
 * d'un patient. Chaque type d'événement a son message dédié, construit
 * uniquement à partir des champs listés dans STAFF_ALERTS ; tout type absent
 * de cette liste blanche n'envoie rien.
 *
 * Configuration : TELEGRAM_BOT_TOKEN et TELEGRAM_BOT_USERNAME (pour le lien
 * t.me qui relie un compte). TELEGRAM_CHAT_ID, facultatif, ajoute un
 * destinataire fixe (un groupe par exemple). Comme PayDunya et Resend, tout
 * est facultatif : sans jeton, chaque appel est un no-op silencieux. Aucune fonction de
 * ce module ne lève d'exception vers l'appelant, et le jeton n'est jamais
 * écrit dans les journaux (il fait partie de l'URL de l'API).
 */

const TELEGRAM_TIMEOUT_MS = 5_000;
const MAX_MESSAGE_LENGTH = 4_096;

const TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
const CHAT_ID_PATTERN = /^(-?\d{1,20}|@[A-Za-z0-9_]{5,32})$/;
const BOT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

/** Les références Orange Money ressemblent à « PP231109.1234.A12345 ». */
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._-]{4,40}$/;

type TelegramConfig = { token: string; botUsername: string | null; fallbackChatId: string | null };

export type TelegramStatus =
  | { state: "missing" }
  | { state: "invalid"; problem: string }
  | { state: "configured"; botUsername: string | null; fallbackChatHint: string | null };

/** Retire les guillemets et espaces qu'un copier-coller laisse parfois autour d'une valeur. */
function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

function rawConfig() {
  return {
    token: clean(process.env.TELEGRAM_BOT_TOKEN),
    botUsername: clean(process.env.TELEGRAM_BOT_USERNAME).replace(/^@/, ""),
    chatId: clean(process.env.TELEGRAM_CHAT_ID),
  };
}

function readConfig(): TelegramConfig | null {
  const { token, botUsername, chatId } = rawConfig();
  // Un jeton mal formé (barre oblique, point d'interrogation…) changerait
  // l'URL appelée : on le traite comme une absence de configuration.
  if (!TOKEN_PATTERN.test(token)) return null;
  return {
    token,
    botUsername: BOT_USERNAME_PATTERN.test(botUsername) ? botUsername : null,
    fallbackChatId: CHAT_ID_PATTERN.test(chatId) ? chatId : null,
  };
}

/** État affiché dans l'administration : jamais le jeton, seulement la fin d'un chat id. */
export function telegramStatus(): TelegramStatus {
  const { token, botUsername, chatId } = rawConfig();
  if (!token) return { state: "missing" };
  if (!TOKEN_PATTERN.test(token)) return { state: "invalid", problem: "TELEGRAM_BOT_TOKEN n'a pas le format d'un jeton de bot (123456789:AA…)." };
  if (botUsername && !BOT_USERNAME_PATTERN.test(botUsername)) {
    return { state: "invalid", problem: "TELEGRAM_BOT_USERNAME doit être le nom d'utilisateur du bot, par exemple KKoumaAlertesBot." };
  }
  if (chatId && !CHAT_ID_PATTERN.test(chatId)) {
    return { state: "invalid", problem: "TELEGRAM_CHAT_ID doit être un identifiant numérique ; il est facultatif, vous pouvez retirer la ligne." };
  }
  return {
    state: "configured",
    botUsername: botUsername || null,
    fallbackChatHint: chatId ? `…${chatId.slice(-4)}` : null,
  };
}

/** Nom d'utilisateur du bot, nécessaire pour relier un compte ; null s'il manque. */
export function telegramBotUsername(): string | null {
  return readConfig()?.botUsername ?? null;
}

/** Lien qui ouvre la conversation avec le bot et lui transmet le code de liaison. */
export function telegramStartLink(code: string): string | null {
  const username = telegramBotUsername();
  return username ? `https://t.me/${username}?start=${encodeURIComponent(code)}` : null;
}

export function isTelegramChatId(value: string | null | undefined): value is string {
  return typeof value === "string" && CHAT_ID_PATTERN.test(value);
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

async function callTelegram(config: TelegramConfig, method: string, payload: object): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    cache: "no-store",
  });
}

/**
 * Envoie un message (déjà au format HTML Telegram) à une conversation.
 * Renvoie true si Telegram l'a accepté, false sinon — sans jamais lever.
 */
export async function sendTelegramMessage(html: string, chatId: string): Promise<boolean> {
  const config = readConfig();
  if (!config || !isTelegramChatId(chatId)) return false;
  try {
    const res = await callTelegram(config, "sendMessage", {
      chat_id: chatId,
      text: html.slice(0, MAX_MESSAGE_LENGTH),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
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

/** Destinataires uniques : les comptes reliés, plus TELEGRAM_CHAT_ID s'il est renseigné. */
export function telegramRecipients(chatIds: (string | null | undefined)[]): string[] {
  const fallback = readConfig()?.fallbackChatId;
  return [...new Set([...chatIds, fallback].filter(isTelegramChatId))];
}

/** Envoie à plusieurs conversations ; renvoie le nombre d'envois acceptés. */
export async function sendTelegramToMany(html: string, chatIds: string[]): Promise<number> {
  const results = await Promise.all(chatIds.map((id) => sendTelegramMessage(html, id)));
  return results.filter(Boolean).length;
}

export type StartMessage = { chatId: string; code: string };

/**
 * Messages « /start <code> » reçus en conversation privée, lus avec
 * getUpdates : pas de webhook à déclarer, le serveur interroge Telegram
 * seulement quand un membre de l'équipe confirme sa liaison.
 */
export async function fetchStartMessages(): Promise<
  { ok: true; messages: StartMessage[] } | { ok: false; reason: "unconfigured" | "webhook" | "refused" | "network" }
> {
  const config = readConfig();
  if (!config) return { ok: false, reason: "unconfigured" };
  try {
    const res = await callTelegram(config, "getUpdates", { allowed_updates: ["message"], limit: 100 });
    // 409 : un webhook est déjà déclaré pour ce bot (une autre application l'utilise).
    if (res.status === 409) return { ok: false, reason: "webhook" };
    if (!res.ok) return { ok: false, reason: "refused" };
    const data = (await res.json()) as {
      result?: { message?: { text?: unknown; chat?: { id?: unknown; type?: unknown } } }[];
    };
    const messages: StartMessage[] = [];
    for (const update of data.result ?? []) {
      const m = update.message;
      if (m?.chat?.type !== "private" || typeof m.text !== "string") continue;
      const match = /^\/start ([A-Za-z0-9_-]{16,64})$/.exec(m.text.trim());
      const chatId = String(m.chat.id);
      if (match && isTelegramChatId(chatId)) messages.push({ chatId, code: match[1] });
    }
    return { ok: true, messages };
  } catch (err) {
    console.error(`[telegram] lecture des messages échouée : ${err instanceof Error ? err.name : "Erreur"}`);
    return { ok: false, reason: "network" };
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

/** Envoie l'alerte d'un événement staff aux destinataires, si son type est dans la liste blanche. */
export async function sendStaffAlert(input: StaffAlertInput, chatIds: (string | null | undefined)[]): Promise<number> {
  try {
    const message = staffAlertMessage(input);
    if (!message) return 0;
    return await sendTelegramToMany(message, telegramRecipients(chatIds));
  } catch (err) {
    console.error(`[telegram:${input.type}] alerte non construite:`, err instanceof Error ? err.name : err);
    return 0;
  }
}

/** Message du bouton « Envoyer un message de test » de /admin/compte. */
export async function sendTelegramTestMessage(chatId: string): Promise<boolean> {
  const url = adminUrl("/admin/compte");
  const parts = [
    "<b>K-Kouma · Message de test</b>",
    "Les alertes de l'équipe arriveront ici.",
  ];
  if (url) parts.push(`<a href="${escapeTelegramHtml(url)}">Ouvrir mon compte</a>`);
  return sendTelegramMessage(parts.join("\n"), chatId);
}

/**
 * Planifie l'alerte après la réponse (after() de Next.js) : l'action de
 * l'utilisateur n'attend jamais Telegram. Hors requête (script, test),
 * after() lève : l'envoi part alors en tâche de fond, ce qui suffit sur un
 * serveur Node permanent (un seul process PM2).
 */
export function scheduleStaffAlert(input: StaffAlertInput, chatIds: (string | null | undefined)[]): void {
  if (!readConfig() || !Object.hasOwn(STAFF_ALERTS, input.type)) return;
  const recipients = telegramRecipients(chatIds);
  if (recipients.length === 0) return;
  const snapshot: StaffAlertInput = { type: input.type, link: input.link, alert: input.alert && { ...input.alert } };
  try {
    after(() => sendStaffAlert(snapshot, recipients));
  } catch {
    void sendStaffAlert(snapshot, recipients);
  }
}
