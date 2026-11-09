import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { telegramWebhookSecret } from "@/lib/telegram";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegramBot";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Messages et boutons du bot Telegram de l'équipe. Telegram joint à chaque
 * appel le secret déclaré avec setWebhook (Réglages → Alertes Telegram) :
 * sans lui, rien n'est traité. Répond toujours 200 à un appel authentifié,
 * pour que Telegram ne renvoie pas en boucle une mise à jour qui a échoué.
 */
export async function POST(req: NextRequest) {
  const secret = telegramWebhookSecret();
  if (!secret) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const received = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!timingSafeEqual(digest(received), digest(secret))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }
  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram:webhook] mise à jour non traitée:", err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ ok: true });
}
