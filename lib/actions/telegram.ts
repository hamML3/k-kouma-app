'use server'

import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { escapeTelegramHtml, fetchStartMessages, sendTelegramMessage, sendTelegramTestMessage, telegramBotUsername } from "@/lib/telegram";

const LINK_TTL_MS = 15 * 60 * 1000;
const PAGE = "/admin/compte";

/** Admin ou modérateur actif : seuls les comptes du staff reçoivent les alertes Telegram. */
async function requireStaff(): Promise<{ id: number; email: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.email || (role !== "admin" && role !== "moderator")) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email };
}

/** Prépare la liaison : un code à usage unique, transmis au bot par le lien t.me. */
export async function startTelegramLinkAction(): Promise<void> {
  const staff = await requireStaff();
  if (!telegramBotUsername()) redirect(`${PAGE}?telegram=unconfigured`);

  await prisma.user.update({
    where: { id: staff.id },
    data: {
      telegramLinkCode: randomBytes(18).toString("base64url"),
      telegramLinkExpiresAt: new Date(Date.now() + LINK_TTL_MS),
    },
  });
  revalidatePath(PAGE);
  redirect(`${PAGE}?telegram=pending`);
}

/**
 * Après « Démarrer » dans Telegram : retrouve le message « /start <code> » du
 * membre et enregistre sa conversation. L'identité vient de la session, le
 * code de la base : rien n'est lu depuis le formulaire.
 */
export async function confirmTelegramLinkAction(): Promise<void> {
  const staff = await requireStaff();
  const user = await prisma.user.findUnique({
    where: { id: staff.id },
    select: { telegramLinkCode: true, telegramLinkExpiresAt: true },
  });
  if (!user?.telegramLinkCode || !user.telegramLinkExpiresAt || user.telegramLinkExpiresAt < new Date()) {
    redirect(`${PAGE}?telegram=expired`);
  }

  const result = await fetchStartMessages();
  if (!result.ok) redirect(`${PAGE}?telegram=${result.reason}`);

  // Le plus récent, si la personne a appuyé plusieurs fois sur « Démarrer ».
  const match = result.messages.filter((m) => m.code === user.telegramLinkCode).at(-1);
  if (!match) redirect(`${PAGE}?telegram=notfound`);

  await prisma.user.update({
    where: { id: staff.id },
    data: { telegramChatId: match.chatId, telegramLinkedAt: new Date(), telegramLinkCode: null, telegramLinkExpiresAt: null },
  });
  await logAudit({ actor: staff, action: "account.telegram_link", metadata: { chatIdEnd: match.chatId.slice(-4) } });

  await sendTelegramMessage(
    `<b>K-Kouma</b>\nVotre compte ${escapeTelegramHtml(staff.email)} est relié. Les alertes de l'équipe arriveront ici.`,
    match.chatId
  );

  revalidatePath(PAGE);
  redirect(`${PAGE}?telegram=linked`);
}

export async function unlinkTelegramAction(): Promise<void> {
  const staff = await requireStaff();
  await prisma.user.update({
    where: { id: staff.id },
    data: { telegramChatId: null, telegramLinkedAt: null, telegramLinkCode: null, telegramLinkExpiresAt: null },
  });
  await logAudit({ actor: staff, action: "account.telegram_unlink" });
  revalidatePath(PAGE);
  redirect(`${PAGE}?telegram=unlinked`);
}

export async function sendMyTelegramTestAction(): Promise<void> {
  const staff = await requireStaff();
  const user = await prisma.user.findUnique({ where: { id: staff.id }, select: { telegramChatId: true } });
  if (!user?.telegramChatId) redirect(`${PAGE}?telegram=notlinked`);
  const delivered = await sendTelegramTestMessage(user.telegramChatId);
  redirect(`${PAGE}?telegram=${delivered ? "test_sent" : "test_failed"}`);
}
