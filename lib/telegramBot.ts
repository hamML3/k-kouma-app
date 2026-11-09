import { readFile, statfs } from "fs/promises";
import { loadavg, totalmem, uptime } from "os";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasPermission, type Permission } from "@/lib/permissions";
import { confirmManualPayment, rejectManualPayment } from "@/lib/manualPayments";
import { isRejectionReason } from "@/lib/validators/payments";
import { PRACTITIONER_TITLES } from "@/lib/practitioners";
import { adminUrl, escapeTelegramHtml as esc, sendTelegramMessage, telegramApi, type InlineKeyboard } from "@/lib/telegram";

// Bot de l'équipe : menu, commandes et actions, reçus par le webhook
// (app/api/telegram/webhook). Seuls les membres du staff qui ont relié leur
// Telegram (Mon compte) sont servis, chacun selon ses droits ; un inconnu ne
// reçoit qu'un message d'orientation. Comme les alertes, aucune réponse ne
// contient de donnée de santé ni l'identité d'un patient.

export const BOT_COMMANDS = [
  { command: "menu", description: "Ouvrir le menu" },
  { command: "resume", description: "Résumé de l'activité" },
  { command: "paiements", description: "Paiements à vérifier" },
  { command: "inscriptions", description: "Inscriptions récentes" },
  { command: "utilisateurs", description: "Derniers comptes et e-mails vérifiés" },
  { command: "candidatures", description: "Praticiens à valider" },
  { command: "serveur", description: "État du serveur" },
  { command: "aide", description: "Aide" },
];

const MENU: InlineKeyboard = [
  [{ text: "📊 Résumé", callback_data: "m:resume" }, { text: "💳 Paiements", callback_data: "m:paiements" }],
  [{ text: "🆕 Inscriptions", callback_data: "m:inscriptions" }, { text: "🩺 Candidatures", callback_data: "m:candidatures" }],
  [{ text: "👥 Utilisateurs", callback_data: "m:utilisateurs" }, { text: "🖥 Serveur", callback_data: "m:serveur" }],
];

const REJECT_LABELS: Record<string, string> = {
  not_found: "Référence introuvable",
  wrong_amount: "Montant incorrect",
  already_used: "Déjà utilisée",
  other: "Autre motif",
};

type Chat = { id: number | string; type?: string };
export type TelegramUpdate = {
  update_id?: number;
  message?: { message_id?: number; text?: string; chat?: Chat };
  callback_query?: { id: string; data?: string; from?: { id: number }; message?: { message_id: number; chat: Chat } };
};

type Staff = { id: number; email: string; role: string; permissions: unknown };

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} XOF`;
const can = (staff: Staff, permission: Permission) => hasPermission(staff.role, staff.permissions, permission);
const link = (path: string, label: string) => {
  const url = adminUrl(path);
  return url ? `<a href="${esc(url)}">${esc(label)}</a>` : "";
};
const startOfDay = (daysAgo = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0); // Bamako est à UTC+0
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
};

async function findStaff(chatId: string): Promise<Staff | null> {
  return prisma.user.findFirst({
    where: { telegramChatId: chatId, role: { in: ["admin", "moderator"] }, status: "active" },
    select: { id: true, email: true, role: true, permissions: true },
  });
}

/** Point d'entrée du webhook. Ne lève pas : une erreur est journalisée et le bot reste muet. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) return handleCallback(update.callback_query);
  const message = update.message;
  if (!message?.chat || message.chat.type !== "private" || typeof message.text !== "string") return;
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Liaison d'un compte : « /start <code> » (bouton Démarrer), ou le code seul.
  const code = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})$/.exec(text)?.[1] ?? /^([A-Za-z0-9_-]{24})$/.exec(text)?.[1];
  if (code) return linkAccount(chatId, code);

  const staff = await findStaff(chatId);
  if (!staff) {
    await sendTelegramMessage(
      "Ce bot est réservé à l'équipe K-Kouma.\nPour recevoir les alertes, reliez votre Telegram depuis <b>Mon compte</b> dans l'administration du site.",
      chatId
    );
    return;
  }

  const command = /^\/(\w+)/.exec(text)?.[1]?.toLowerCase() ?? "menu";
  await runCommand(staff, chatId, command);
}

async function linkAccount(chatId: string, code: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { telegramLinkCode: code, telegramLinkExpiresAt: { gt: new Date() }, role: { in: ["admin", "moderator"] }, status: "active" },
    select: { id: true, email: true },
  });
  if (!user) {
    await sendTelegramMessage(
      "Ce code n'est pas valable ou a expiré (15 minutes). Sur le site, dans <b>Mon compte</b>, cliquez à nouveau sur « Relier mon Telegram ».",
      chatId
    );
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId, telegramLinkedAt: new Date(), telegramLinkCode: null, telegramLinkExpiresAt: null },
  });
  await logAudit({ actor: user, action: "account.telegram_link", metadata: { chatIdEnd: chatId.slice(-4), via: "telegram" } });
  await sendTelegramMessage(
    `✅ Votre compte ${esc(user.email)} est relié. Les alertes de l'équipe arriveront ici.\n\nTapez / ou utilisez le menu ci-dessous à tout moment.`,
    chatId,
    MENU
  );
}

async function runCommand(staff: Staff, chatId: string, command: string): Promise<void> {
  switch (command) {
    case "resume":
      return void (await sendTelegramMessage(await summary(staff), chatId, MENU));
    case "paiements":
      return sendPayments(staff, chatId);
    case "inscriptions":
      return void (await sendTelegramMessage(await registrations(), chatId));
    case "utilisateurs":
      return void (await sendTelegramMessage(await users(), chatId));
    case "candidatures":
      return void (await sendTelegramMessage(await applications(), chatId));
    case "serveur":
      return void (await sendTelegramMessage(staff.role === "admin" ? await serverState() : "Réservé aux administrateurs.", chatId));
    case "aide":
      return void (await sendTelegramMessage(help(), chatId, MENU));
    default:
      return void (await sendTelegramMessage("<b>K-Kouma</b> · Que voulez-vous consulter ?", chatId, MENU));
  }
}

function help(): string {
  return [
    "<b>K-Kouma · Aide</b>",
    ...BOT_COMMANDS.map((c) => `/${c.command} — ${esc(c.description)}`),
    "",
    "Les alertes (paiement à vérifier, candidature, signalement…) arrivent ici automatiquement.",
  ].join("\n");
}

async function summary(staff: Staff): Promise<string> {
  const today = startOfDay();
  const [patientsToday, patients7, pendingPayments, pendingTherapists, pendingArticles, pendingReports, pendingReviews, sessionsToday, pendingPayouts] =
    await Promise.all([
      prisma.user.count({ where: { role: "patient", createdAt: { gte: today } } }),
      prisma.user.count({ where: { role: "patient", createdAt: { gte: startOfDay(6) } } }),
      can(staff, "manage_finances")
        ? prisma.payment.aggregate({ where: { status: "pending", provider: "orange_money_manual" }, _count: true, _sum: { amount: true } })
        : null,
      prisma.therapistProfile.count({ where: { isVerified: false, rejectedAt: null, user: { status: "active" } } }),
      staff.role === "admin" ? prisma.submittedArticle.count({ where: { status: "pending" } }) : null,
      can(staff, "manage_reports") ? prisma.report.count({ where: { status: "pending" } }) : null,
      prisma.sessionReview.count({ where: { status: "pending" } }),
      prisma.appointment.count({
        where: { scheduledAt: { gte: today, lt: startOfDay(-1) }, status: { in: ["pending", "confirmed"] } },
      }),
      can(staff, "manage_finances") ? prisma.payoutRequest.count({ where: { status: "pending" } }) : null,
    ]);

  const lines = [
    `<b>K-Kouma · Résumé du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Bamako" })}</b>`,
    `🆕 Inscriptions patients : ${patientsToday} aujourd'hui · ${patients7} sur 7 jours`,
    `📅 Séances aujourd'hui : ${sessionsToday}`,
  ];
  if (pendingPayments) {
    lines.push(`💳 Paiements à vérifier : ${pendingPayments._count}${pendingPayments._count ? ` (${fcfa(Number(pendingPayments._sum.amount ?? 0))})` : ""}`);
  }
  if (pendingPayouts !== null) lines.push(`💸 Retraits demandés : ${pendingPayouts}`);
  lines.push(`🩺 Candidatures à valider : ${pendingTherapists}`);
  if (pendingArticles !== null) lines.push(`📝 Articles à relire : ${pendingArticles}`);
  if (pendingReports !== null) lines.push(`🚩 Signalements à examiner : ${pendingReports}`);
  lines.push(`⭐ Avis à modérer : ${pendingReviews}`);
  const admin = link("/admin", "Ouvrir l'administration");
  if (admin) lines.push("", admin);
  return lines.join("\n");
}

function paymentCard(p: { id: number; amount: unknown; sessionsCount: number; providerRef: string | null; createdAt: Date }): string {
  return [
    `<b>💳 Paiement Orange Money n° ${p.id}</b>`,
    `Montant : ${fcfa(Number(p.amount))} · ${p.sessionsCount === 1 ? "1 séance" : `pack de ${p.sessionsCount}`}`,
    `Référence : <code>${esc(p.providerRef ?? "—")}</code>`,
    `Déclaré le ${p.createdAt.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" })}`,
  ].join("\n");
}

const paymentButtons = (id: number): InlineKeyboard => [
  [{ text: "✅ Valider", callback_data: `p:v:${id}` }, { text: "❌ Refuser", callback_data: `p:r:${id}` }],
];

async function sendPayments(staff: Staff, chatId: string): Promise<void> {
  if (!can(staff, "manage_finances")) {
    await sendTelegramMessage("Vous n'avez pas le droit « Finances ».", chatId);
    return;
  }
  const pending = await prisma.payment.findMany({
    where: { status: "pending", provider: "orange_money_manual" },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, amount: true, sessionsCount: true, providerRef: true, createdAt: true },
  });
  if (pending.length === 0) {
    await sendTelegramMessage("✅ Aucun paiement en attente de vérification.", chatId);
    return;
  }
  await sendTelegramMessage(
    `<b>${pending.length} paiement${pending.length > 1 ? "s" : ""} à vérifier</b>\nRetrouvez chaque référence et son montant dans l'historique de votre compte marchand avant de valider.`,
    chatId
  );
  for (const p of pending) await sendTelegramMessage(paymentCard(p), chatId, paymentButtons(p.id));
}

async function registrations(): Promise<string> {
  const [today, week, month, total, recent, verified] = await Promise.all([
    prisma.user.count({ where: { role: "patient", createdAt: { gte: startOfDay() } } }),
    prisma.user.count({ where: { role: "patient", createdAt: { gte: startOfDay(6) } } }),
    prisma.user.count({ where: { role: "patient", createdAt: { gte: startOfDay(29) } } }),
    prisma.user.count({ where: { role: "patient" } }),
    prisma.user.count({ where: { role: "therapist", createdAt: { gte: startOfDay(6) } } }),
    prisma.user.count({ where: { role: "patient", emailVerifiedAt: { not: null } } }),
  ]);
  return [
    "<b>🆕 Inscriptions patients</b>",
    `Aujourd'hui : ${today}`,
    `7 derniers jours : ${week}`,
    `30 derniers jours : ${month}`,
    `Total : ${total}`,
    `E-mails vérifiés : ${verified} sur ${total}${total > verified ? ` (${total - verified} non vérifiés)` : ""}`,
    "",
    `Praticiens inscrits ces 7 derniers jours : ${recent}`,
    link("/admin/users", "Voir les utilisateurs"),
  ].join("\n");
}

/**
 * Derniers comptes créés. Les praticiens sont nommés (ce sont des
 * professionnels inscrits publiquement) ; un patient n'apparaît que sous son
 * numéro : être inscrit sur K-Kouma révèle un suivi psychologique, donnée de
 * santé qui n'a pas sa place sur un service tiers. Son nom est à un clic, dans
 * l'administration.
 */
async function users(): Promise<string> {
  const recent = await prisma.user.findMany({
    where: { role: { in: ["patient", "therapist"] } },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      role: true,
      createdAt: true,
      emailVerifiedAt: true,
      therapistProfile: { select: { firstName: true, lastName: true, practitionerKind: true, isVerified: true } },
    },
  });
  if (recent.length === 0) return "Aucun compte pour l'instant.";
  const lines = recent.map((u) => {
    const who = u.therapistProfile
      ? `${esc(`${u.therapistProfile.firstName} ${u.therapistProfile.lastName}`)} · ${esc(PRACTITIONER_TITLES[u.therapistProfile.practitionerKind])}${u.therapistProfile.isVerified ? "" : " · dossier à valider"}`
      : `Patient n°${u.id}`;
    const date = u.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Bamako" });
    return `${u.emailVerifiedAt ? "✅" : "✉️"} ${who} · ${date}`;
  });
  return [
    "<b>👥 Derniers comptes</b>",
    "✅ e-mail vérifié · ✉️ pas encore vérifié",
    "",
    ...lines,
    "",
    link("/admin/users?email=non-verifie", "Voir les e-mails non vérifiés"),
  ].join("\n");
}

async function applications(): Promise<string> {
  const pending = await prisma.therapistProfile.findMany({
    where: { isVerified: false, rejectedAt: null, user: { status: "active" } },
    orderBy: { user: { createdAt: "asc" } },
    take: 15,
    select: { firstName: true, lastName: true, practitionerKind: true, userId: true, user: { select: { createdAt: true } } },
  });
  if (pending.length === 0) return "✅ Aucune candidature en attente.";
  return [
    `<b>🩺 ${pending.length} candidature${pending.length > 1 ? "s" : ""} à valider</b>`,
    ...pending.map(
      (t) =>
        `• ${esc(`${t.firstName} ${t.lastName}`)} · ${esc(PRACTITIONER_TITLES[t.practitionerKind])} · ${t.user.createdAt.toLocaleDateString("fr-FR")} ${link(`/admin/therapists/${t.userId}`, "voir")}`
    ),
    "",
    "Les diplômes se vérifient sur le site.",
  ].join("\n");
}

async function serverState(): Promise<string> {
  const lines = ["<b>🖥 État du serveur</b>"];
  try {
    const fsStat = await statfs("/");
    const used = 1 - fsStat.bavail / fsStat.blocks;
    lines.push(`Disque : ${Math.round(used * 100)} % utilisé (${(Number(fsStat.bavail) * Number(fsStat.bsize) / 1e9).toFixed(1)} Go libres)`);
  } catch {
    lines.push("Disque : non mesurable");
  }
  try {
    const meminfo = await readFile("/proc/meminfo", "utf8");
    const avail = Number(/MemAvailable:\s+(\d+)/.exec(meminfo)?.[1]) * 1024;
    lines.push(`Mémoire : ${Math.round(avail / 1e6)} Mo disponibles sur ${Math.round(totalmem() / 1e6)} Mo`);
  } catch {
    lines.push(`Mémoire totale : ${Math.round(totalmem() / 1e6)} Mo`);
  }
  lines.push(`Charge (1, 5, 15 min) : ${loadavg().map((l) => l.toFixed(2)).join(" · ")}`);
  const up = uptime();
  lines.push(`Serveur allumé depuis ${Math.floor(up / 86400)} j ${Math.floor((up % 86400) / 3600)} h`);
  lines.push(`Application démarrée il y a ${Math.floor(process.uptime() / 3600)} h ${Math.floor((process.uptime() % 3600) / 60)} min`);
  return lines.join("\n");
}

type Callback = NonNullable<TelegramUpdate["callback_query"]>;

async function handleCallback(cb: Callback): Promise<void> {
  const answer = (text?: string) => telegramApi("answerCallbackQuery", { callback_query_id: cb.id, ...(text ? { text } : {}) });
  const chat = cb.message?.chat;
  if (!chat || chat.type !== "private" || !cb.data) return void (await answer());
  const chatId = String(chat.id);
  const staff = await findStaff(chatId);
  if (!staff) return void (await answer("Compte non relié."));

  const [kind, action, rawId, extra] = cb.data.split(":");
  if (kind === "m") {
    await answer();
    return runCommand(staff, chatId, action);
  }
  if (kind !== "p") return void (await answer());

  if (!can(staff, "manage_finances")) return void (await answer("Vous n'avez pas le droit « Finances »."));
  const id = Number(rawId);
  const payment = Number.isInteger(id)
    ? await prisma.payment.findFirst({
        where: { id, provider: "orange_money_manual" },
        select: { id: true, amount: true, sessionsCount: true, providerRef: true, createdAt: true, status: true },
      })
    : null;
  if (!payment) return void (await answer("Paiement introuvable."));

  const edit = (text: string, keyboard?: InlineKeyboard) =>
    telegramApi("editMessageText", {
      chat_id: chatId,
      message_id: cb.message!.message_id,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: keyboard ?? [] },
    });
  const card = paymentCard(payment);

  if (payment.status !== "pending") {
    await answer("Déjà traité.");
    return void (await edit(`${card}\n\n<i>Déjà traité (${payment.status === "completed" ? "validé" : "refusé"}).</i>`));
  }

  switch (action) {
    case "v": // demande de confirmation : un seul appui ne crédite jamais de séances
      await answer();
      return void (await edit(`${card}\n\n<b>Confirmez-vous avoir reçu ${fcfa(Number(payment.amount))} avec cette référence ?</b>`, [
        [{ text: `✅ Oui, valider`, callback_data: `p:V:${id}` }, { text: "Annuler", callback_data: `p:n:${id}` }],
      ]));
    case "V": {
      const result = await confirmManualPayment(id, staff, "telegram");
      await answer(result.ok ? "Paiement validé." : "Déjà traité.");
      return void (await edit(
        result.ok
          ? `${card}\n\n✅ <b>Validé</b> : ${payment.sessionsCount} séance${payment.sessionsCount > 1 ? "s" : ""} créditée${payment.sessionsCount > 1 ? "s" : ""}, facture envoyée au patient.`
          : `${card}\n\n<i>Déjà traité par quelqu'un d'autre.</i>`
      ));
    }
    case "r":
      await answer();
      return void (await edit(`${card}\n\n<b>Pourquoi refuser ?</b> Le motif est transmis au patient.`, [
        ...Object.entries(REJECT_LABELS).map(([reason, label]) => [{ text: label, callback_data: `p:x:${id}:${reason}` }]),
        [{ text: "Annuler", callback_data: `p:n:${id}` }],
      ]));
    case "x": {
      const reason = isRejectionReason(extra) ? extra : "other";
      const result = await rejectManualPayment(id, staff, reason, "telegram");
      await answer(result.ok ? "Paiement refusé." : "Déjà traité.");
      return void (await edit(
        result.ok ? `${card}\n\n❌ <b>Refusé</b> (${esc(REJECT_LABELS[reason])}). Le patient est prévenu.` : `${card}\n\n<i>Déjà traité par quelqu'un d'autre.</i>`
      ));
    }
    default: // "n" : annuler, on revient aux deux boutons
      await answer();
      return void (await edit(card, paymentButtons(id)));
  }
}
