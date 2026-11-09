import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { CopyText } from "@/components/CopyText";
import { ChangeEmailForm } from "@/components/ChangeEmailForm";
import { telegramStartLink, telegramStatus } from "@/lib/telegram";
import {
  confirmTelegramLinkAction,
  sendMyTelegramTestAction,
  startTelegramLinkAction,
  unlinkTelegramAction,
} from "@/lib/actions/telegram";

export const metadata = { title: "Mon compte — K-Kouma" };

const NOTICES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: "Telegram relié. Un message de confirmation vous a été envoyé, avec le menu du bot.", ok: true },
  unlinked: { text: "Telegram délié : vous ne recevrez plus les alertes.", ok: true },
  test_sent: { text: "Message de test envoyé : vérifiez votre conversation avec le bot.", ok: true },
  test_failed: { text: "Telegram n'a pas accepté le message. Avez-vous bloqué ou supprimé le bot ? Reliez à nouveau votre Telegram.", ok: false },
  notfound: { text: "Pas encore reçu. Dans Telegram, appuyez sur « Démarrer », ou envoyez au bot le message indiqué ci-dessous, puis réessayez.", ok: false },
  expired: { text: "Le lien a expiré (15 minutes). Recommencez.", ok: false },
  webhook: { text: "Ce bot est déjà utilisé par une autre application (webhook déclaré). Créez un bot réservé à K-Kouma avec @BotFather.", ok: false },
  refused: { text: "Telegram refuse le jeton du bot. Vérifiez TELEGRAM_BOT_TOKEN dans le fichier .env du serveur.", ok: false },
  network: { text: "Telegram ne répond pas. Réessayez dans un instant.", ok: false },
  unconfigured: { text: "Le bot Telegram n'est pas configuré sur le serveur.", ok: false },
  notlinked: { text: "Reliez d'abord votre Telegram.", ok: false },
};

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ telegram?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isStaff = session.user.role === "admin" || session.user.role === "moderator";

  const { telegram: notice } = await searchParams;
  const user = isStaff
    ? await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { email: true, pendingEmail: true, telegramChatId: true, telegramLinkedAt: true, telegramLinkCode: true, telegramLinkExpiresAt: true },
      })
    : null;
  const status = telegramStatus();
  const pendingCode =
    user?.telegramLinkCode && user.telegramLinkExpiresAt && user.telegramLinkExpiresAt > new Date() ? user.telegramLinkCode : null;
  const startLink = pendingCode ? telegramStartLink(pendingCode) : null;
  const message = notice ? NOTICES[notice] : undefined;

  return (
    <div className="max-w-lg space-y-6">
      <ChangePasswordForm email={user?.email ?? session.user.email ?? ""} />
      <ChangeEmailForm currentEmail={user?.email ?? session.user.email ?? ""} pendingEmail={user?.pendingEmail ?? null} />

      {isStaff && (
        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Alertes sur Telegram
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Recevez sur Telegram un message court quand une action vous attend : paiement à vérifier, candidature,
            article à relire, signalement… Aucune donnée de santé ni d&apos;identité de patient n&apos;y est envoyée.
          </p>

          {message && (
            <div
              className="rounded-xl p-3 mb-4 text-sm font-semibold"
              style={
                message.ok
                  ? { background: "var(--kk-green-light)", color: "var(--kk-green-text)" }
                  : { background: "#FFF1F0", color: "#9B2C20" }
              }
            >
              {message.text}
            </div>
          )}

          {status.state !== "configured" || !status.botUsername ? (
            <p className="text-sm" style={{ color: "var(--kk-mid)" }}>
              Le bot n&apos;est pas encore configuré sur le serveur (TELEGRAM_BOT_TOKEN et TELEGRAM_BOT_USERNAME dans
              le fichier .env).
              {status.state === "invalid" && <> {status.problem}</>}
            </p>
          ) : user?.telegramChatId ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "var(--kk-green-text)" }}>
                ✓ Relié à @{status.botUsername}
                {user.telegramLinkedAt && <> depuis le {user.telegramLinkedAt.toLocaleDateString("fr-FR")}</>}
              </p>
              <div className="flex gap-2 flex-wrap">
                <form action={sendMyTelegramTestAction}>
                  <button type="submit" className="kk-btn-purple px-4 py-2 text-sm">
                    Envoyer un message de test
                  </button>
                </form>
                <form action={unlinkTelegramAction}>
                  <button type="submit" className="kk-btn-outline px-4 py-2 text-sm">
                    Délier
                  </button>
                </form>
              </div>
            </div>
          ) : startLink ? (
            <div className="space-y-3">
              <ol className="list-decimal pl-5 space-y-1 text-sm" style={{ color: "var(--kk-mid)" }}>
                <li>Ouvrez le bot dans Telegram avec le bouton ci-dessous.</li>
                <li>
                  Appuyez sur <strong style={{ color: "var(--kk-dark)" }}>Démarrer</strong> (ou « Start »).
                </li>
                <li>Revenez ici et confirmez.</li>
              </ol>
              <div className="flex gap-2 flex-wrap">
                <a href={startLink} target="_blank" rel="noopener noreferrer" className="kk-btn-purple px-4 py-2 text-sm">
                  Ouvrir @{status.botUsername}
                </a>
                <form action={confirmTelegramLinkAction}>
                  <button type="submit" className="kk-btn-green px-4 py-2 text-sm">
                    J&apos;ai appuyé sur Démarrer
                  </button>
                </form>
              </div>
              <div className="text-xs space-y-1.5" style={{ color: "var(--kk-mid)" }}>
                <p>
                  Le bouton « Démarrer » n&apos;apparaît pas (bot déjà ouvert) ? Envoyez-lui simplement ce message :
                </p>
                <CopyText value={`/start ${pendingCode}`} />
                <p style={{ color: "var(--kk-faint)" }}>Ce code est personnel et valable 15 minutes.</p>
              </div>
            </div>
          ) : (
            <form action={startTelegramLinkAction}>
              <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
                Relier mon Telegram
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
