import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updatePlatformSettingsAction,
  updateAnnouncementSettingAction,
  updateMaintenanceModeAction,
  updateFeatureTogglesAction,
  updateInvoiceSettingsAction,
  updateOrangeMoneySettingsAction,
  enableTelegramCommandsAction,
  disableTelegramCommandsAction,
} from "@/lib/actions/settings";
import { telegramApi, telegramStatus, telegramWebhookUrl } from "@/lib/telegram";
import Link from "next/link";
import { getOrangeMoneyConfig } from "@/lib/orangeMoney";
import { isPaydunyaConfigured } from "@/lib/paydunya";

export const metadata = { title: "Réglages — Administration K-Kouma" };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");

  const { saved, error } = await searchParams;

  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const defaultPercent = Number(settings?.defaultCommissionPercent ?? 20);
  const announcementActive = settings?.announcementActive ?? false;
  const announcementText = settings?.announcementText ?? "";
  const maintenanceModeEnabled = settings?.maintenanceModeEnabled ?? false;
  const orangeMoney = await getOrangeMoneyConfig();
  const merchantCodeFromEnv = !settings?.orangeMoneyMerchantCode && orangeMoney.merchantCode !== null;
  const paydunyaActive = isPaydunyaConfigured();
  const telegram = telegramStatus();
  const commandsEnabled = Boolean(settings?.telegramCommandsEnabledAt);
  // État réel côté Telegram, seulement si le menu est censé être actif.
  const webhookInfo = commandsEnabled
    ? ((await telegramApi("getWebhookInfo", {})).result as { url?: string; last_error_message?: string; pending_update_count?: number } | undefined)
    : undefined;
  const webhookMismatch = commandsEnabled && webhookInfo !== undefined && webhookInfo.url !== telegramWebhookUrl();
  const linkedStaff = await prisma.user.count({
    where: { role: { in: ["admin", "moderator"] }, status: "active", telegramChatId: { not: null } },
  });
  const showLifeCoachCard = settings?.showLifeCoachCard ?? true;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Réglages
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Paramètres globaux de la plateforme
        </p>
      </div>

      {saved === "commission" && (
        <div className="rounded-2xl p-4 mb-6 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}>
          Enregistré. Les thérapeutes concernés ont été prévenus par email.
        </div>
      )}
      {saved && saved !== "commission" && (
        <div className="rounded-2xl p-4 mb-6 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}>
          Enregistré.
        </div>
      )}
      {error === "telegram_unconfigured" && (
        <div className="kk-error mb-6">Configurez d&apos;abord TELEGRAM_BOT_TOKEN et TELEGRAM_BOT_USERNAME dans le fichier .env du serveur.</div>
      )}
      {error === "telegram_https" && (
        <div className="kk-error mb-6">Le menu du bot demande un site en https (NEXTAUTH_URL) : Telegram refuse les adresses en http.</div>
      )}
      {error === "telegram_webhook" && (
        <div className="kk-error mb-6">Telegram a refusé l&apos;activation. Vérifiez le jeton du bot et que le site est joignable depuis Internet.</div>
      )}
      {error === "merchant_code" && (
        <div className="kk-error mb-6">Code marchand invalide : il doit contenir uniquement des chiffres (4 à 20).</div>
      )}
      {error === "invalid" && (
        <div className="kk-error mb-6">Pourcentage invalide (doit être entre 0 et 100).</div>
      )}
      <div className="grid sm:grid-cols-2 gap-6 items-start">
        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Commission par défaut
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Part prélevée par K-Kouma sur chaque séance payée, pour tout thérapeute sans commission
            personnalisée (réglable individuellement depuis sa fiche).
          </p>

          <form action={updatePlatformSettingsAction} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="defaultCommissionPercent" className="kk-label">Pourcentage</label>
              <div className="flex items-center gap-2">
                <input
                  id="defaultCommissionPercent"
                  name="defaultCommissionPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={defaultPercent}
                  required
                  className="kk-input"
                />
                <span className="text-sm font-bold shrink-0" style={{ color: "var(--kk-mid)" }}>%</span>
              </div>
            </div>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Bannière d&apos;annonce
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Message affiché en haut de toutes les pages (publiques et espace connecté), masquable par chaque
            visiteur. Idéal pour une maintenance programmée ou une nouveauté à annoncer.
          </p>

          <form action={updateAnnouncementSettingAction} className="space-y-3">
            <div>
              <label htmlFor="announcementText" className="kk-label">Texte de l&apos;annonce</label>
              <textarea
                id="announcementText"
                name="announcementText"
                rows={2}
                maxLength={280}
                defaultValue={announcementText}
                placeholder="ex. Nouveauté : coach de vie disponible dès aujourd'hui !"
                className="kk-input resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="announcementActive" defaultChecked={announcementActive} />
              Afficher cette bannière sur le site
            </label>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Mode maintenance
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Affiche un bandeau d&apos;avertissement sur tout le site et bloque temporairement les nouveaux achats
            de séances (patients). N&apos;affecte jamais l&apos;accès à l&apos;administration.
          </p>

          <form action={updateMaintenanceModeAction} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="maintenanceModeEnabled" defaultChecked={maintenanceModeEnabled} />
              Activer le mode maintenance
            </label>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Fonctionnalités
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Activer ou suspendre des options de la plateforme sans redéploiement.
          </p>

          <form action={updateFeatureTogglesAction} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="showLifeCoachCard" defaultChecked={showLifeCoachCard} />
              Proposer le coaching : carte &laquo; Coach de vie / Conseil &raquo; sur la page d&apos;accueil et choix dans le questionnaire
            </label>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Paiement Orange Money
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--kk-mid)" }}>
            En attendant l&apos;API de paiement : les patients paient votre code marchand depuis leur téléphone,
            déclarent la référence reçue par SMS, et vous validez dans Finances après vérification sur votre
            compte marchand.
          </p>
          <p
            className="text-xs font-semibold rounded-xl px-3 py-2 mb-4"
            style={
              orangeMoney.enabled && !paydunyaActive
                ? { background: "var(--kk-green-light)", color: "var(--kk-green-text)" }
                : { background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }
            }
          >
            {paydunyaActive
              ? "Le paiement en ligne PayDunya est actif : le paiement manuel n'est pas proposé aux patients."
              : orangeMoney.enabled
              ? "Actif : les patients voient ce mode de paiement sur la page Mes séances."
              : !orangeMoney.merchantCode
              ? "Inactif : saisissez votre code marchand pour l'ouvrir aux patients."
              : "Suspendu : cochez la case pour le rouvrir aux patients."}
          </p>

          <form action={updateOrangeMoneySettingsAction} className="space-y-3">
            <div>
              <label htmlFor="orangeMoneyMerchantCode" className="kk-label">
                Code marchand
              </label>
              <input
                id="orangeMoneyMerchantCode"
                name="orangeMoneyMerchantCode"
                inputMode="numeric"
                maxLength={30}
                defaultValue={settings?.orangeMoneyMerchantCode ?? ""}
                placeholder={merchantCodeFromEnv ? `${orangeMoney.merchantCode} (fichier .env)` : "Ex. 123456"}
                className="kk-input"
              />
            </div>
            <div>
              <label htmlFor="orangeMoneyMerchantName" className="kk-label">
                Nom du compte affiché par Orange Money (facultatif)
              </label>
              <input
                id="orangeMoneyMerchantName"
                name="orangeMoneyMerchantName"
                maxLength={100}
                defaultValue={settings?.orangeMoneyMerchantName ?? "K-Kouma Sarl Siege Marchand"}
                placeholder="K-Kouma Sarl Siege Marchand"
                className="kk-input"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="orangeMoneyManualEnabled" defaultChecked={orangeMoney.switchedOn} />
              Proposer ce mode de paiement aux patients
            </label>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Factures
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Mention fiscale imprimée en bas de chaque facture, à valider avec votre comptable. Laissez vide pour n&apos;en afficher aucune.
          </p>

          <form action={updateInvoiceSettingsAction} className="space-y-3">
            <div>
              <label htmlFor="invoiceTaxNote" className="kk-label">
                Mention fiscale
              </label>
              <input
                id="invoiceTaxNote"
                name="invoiceTaxNote"
                maxLength={255}
                defaultValue={settings?.invoiceTaxNote ?? ""}
                className="kk-input"
              />
            </div>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>

        <div className="kk-card p-6">
          <p className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Alertes Telegram
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--kk-mid)" }}>
            Message court sur Telegram quand une action est attendue (paiement à vérifier, candidature, article,
            signalement…), envoyé à chaque membre de l&apos;équipe qui a relié son Telegram dans « Mon compte ».
            Aucune donnée de santé ni d&apos;identité de patient n&apos;y est envoyée. Le bot se règle dans le fichier
            .env du serveur : TELEGRAM_BOT_TOKEN et TELEGRAM_BOT_USERNAME.
          </p>

          <p className="text-sm font-semibold mb-4" style={{ color: "var(--kk-mid)" }}>
            {telegram.state === "configured" &&
              (telegram.botUsername ? (
                <>
                  Bot @{telegram.botUsername} configuré ·{" "}
                  {linkedStaff === 0 ? "aucun membre relié" : `${linkedStaff} membre${linkedStaff > 1 ? "s" : ""} relié${linkedStaff > 1 ? "s" : ""}`}
                  {telegram.fallbackChatHint && <> · destinataire fixe se terminant par {telegram.fallbackChatHint}</>}.
                </>
              ) : (
                <>Jeton configuré, mais TELEGRAM_BOT_USERNAME manque : personne ne peut relier son Telegram.</>
              ))}
            {telegram.state === "missing" && <>Non configuré : aucune alerte n&apos;est envoyée.</>}
            {telegram.state === "invalid" && <>Configuration invalide : {telegram.problem}</>}
          </p>

          <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: "var(--kk-bg)", color: "var(--kk-mid)" }}>
            <p className="font-bold mb-1" style={{ color: "var(--kk-dark)" }}>
              Menu et commandes du bot {commandsEnabled ? "· actifs" : "· inactifs"}
            </p>
            <p>
              Une fois actifs, le bot répond aux membres reliés : résumé de l&apos;activité, paiements à vérifier (avec
              boutons Valider / Refuser), inscriptions, candidatures, état du serveur. Le bot doit être réservé à ce
              site : le site de test a besoin d&apos;un autre bot.
            </p>
            {webhookMismatch && (
              <p className="mt-2 font-semibold" style={{ color: "#9B2C20" }}>
                Le bot est actuellement branché sur une autre adresse ({webhookInfo?.url || "aucune"}) : réactivez le menu.
              </p>
            )}
            {webhookInfo?.last_error_message && (
              <p className="mt-2 font-semibold" style={{ color: "#9B2C20" }}>
                Dernière erreur signalée par Telegram : {webhookInfo.last_error_message}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link href="/admin/compte" className="kk-btn-outline inline-block px-5 py-2.5 text-sm">
              Relier mon Telegram
            </Link>
            {telegram.state === "configured" && telegram.botUsername && (
              <form action={commandsEnabled ? disableTelegramCommandsAction : enableTelegramCommandsAction}>
                <button type="submit" className={`${commandsEnabled ? "kk-btn-outline" : "kk-btn-purple"} px-5 py-2.5 text-sm`}>
                  {commandsEnabled ? (webhookMismatch ? "Désactiver" : "Désactiver le menu") : "Activer le menu du bot"}
                </button>
              </form>
            )}
            {commandsEnabled && webhookMismatch && (
              <form action={enableTelegramCommandsAction}>
                <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
                  Réactiver
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
