import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePlatformSettingsAction } from "@/lib/actions/settings";

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

      {saved === "1" && (
        <div className="rounded-2xl p-4 mb-6 text-sm font-semibold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
          Enregistré. Les thérapeutes concernés ont été prévenus par email.
        </div>
      )}
      {error === "invalid" && (
        <div className="kk-error mb-6">Pourcentage invalide (doit être entre 0 et 100).</div>
      )}

      <div className="max-w-md rounded-2xl p-6" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
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
    </>
  );
}
