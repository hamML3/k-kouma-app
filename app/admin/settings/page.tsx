import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updatePlatformSettingsAction,
  updateAnnouncementSettingAction,
  updateMaintenanceModeAction,
  updateFeatureTogglesAction,
} from "@/lib/actions/settings";

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
  const orangeMoneyManualEnabled = settings?.orangeMoneyManualEnabled ?? true;
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
        <div className="rounded-2xl p-4 mb-6 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
          Enregistré. Les thérapeutes concernés ont été prévenus par email.
        </div>
      )}
      {saved && saved !== "commission" && (
        <div className="rounded-2xl p-4 mb-6 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
          Enregistré.
        </div>
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
              <input type="checkbox" name="orangeMoneyManualEnabled" defaultChecked={orangeMoneyManualEnabled} />
              Paiement manuel Orange Money (nécessite un code marchand configuré)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              <input type="checkbox" name="showLifeCoachCard" defaultChecked={showLifeCoachCard} />
              Afficher la carte &laquo; Coach de vie / Conseil &raquo; sur la page d&apos;accueil
            </label>
            <button type="submit" className="kk-btn-purple px-5 py-2.5 text-sm">
              Enregistrer
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
