import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { verifyTherapist, rejectTherapist, suspendUser, unsuspendUser, updateTherapistCommissionAction } from "@/lib/actions/admin";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import Link from "next/link";

type DocEntry = { label: string; url: string };

export default async function AdminTherapistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const userId = Number(id);
  if (isNaN(userId)) notFound();

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { therapistProfile: true },
    }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!user || !user.therapistProfile) notFound();

  const t = user.therapistProfile;
  const isVerified = t.isVerified;
  const isRejected = Boolean(t.rejectedAt);
  const isSuspended = user.status === "suspended";
  const isPending = !isVerified && !isRejected && !isSuspended;

  const docs: DocEntry[] = Array.isArray(t.documentsJson)
    ? (t.documentsJson as DocEntry[])
    : t.diplomaUrl
    ? [{ label: "Diplôme", url: t.diplomaUrl }]
    : [];

  return (
    <>
      <Link
        href="/admin/therapists"
        className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6"
        style={{ color: "var(--kk-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour à la liste
      </Link>

      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              {t.firstName} {t.lastName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
              {user.email}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isVerified && (
              <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
                ✓ Vérifié
              </span>
            )}
            {isRejected && (
              <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: "#FFF1F0", color: "#C0392B" }}>
                Rejeté
              </span>
            )}
            {isSuspended && (
              <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: "#FFF1F0", color: "#C0392B" }}>
                Suspendu
              </span>
            )}
            {isPending && (
              <span className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold)" }}>
                En attente
              </span>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl p-6 mb-5 space-y-4" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Téléphone" value={user.phoneNumber ?? "—"} />
          <InfoRow
            label="Inscrit le"
            value={new Date(user.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
          <InfoRow label="Langues" value={t.languages ?? "—"} />
          <InfoRow label="Spécialités" value={t.specialties ?? "—"} />
          <InfoRow
            label="Commission"
            value={
              t.commissionPercent != null
                ? `${Number(t.commissionPercent)}% (personnalisée)`
                : `${Number(settings?.defaultCommissionPercent ?? 20)}% (défaut plateforme)`
            }
          />
          <InfoRow
            label="Conditions"
            value={
              t.commissionAcceptedAt
                ? `Acceptées le ${new Date(t.commissionAcceptedAt).toLocaleDateString("fr-FR")} (${Number(t.commissionAcceptedPercent)}%)`
                : "Pas encore acceptées"
            }
          />
          {t.bio && (
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--kk-muted)" }}>PRÉSENTATION</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>{t.bio}</p>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <p className="text-xs font-bold mb-3" style={{ color: "var(--kk-muted)" }}>DOSSIER JOINT</p>
          {docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--kk-purple-light)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--kk-purple)" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="white" strokeWidth="1.5" />
                      <path d="M10 2v3h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--kk-purple)" }}>{doc.label}</p>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold underline"
                      style={{ color: "var(--kk-mid)" }}
                    >
                      Ouvrir le fichier →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-3 rounded-xl" style={{ background: "var(--kk-border)", color: "var(--kk-muted)" }}>
              Aucun document fourni lors de l&apos;inscription
            </p>
          )}
        </div>

        {/* Commission — réservé à l'admin */}
        {isAdmin && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--kk-muted)" }}>COMMISSION PERSONNALISÉE</p>
            <p className="text-xs mb-3" style={{ color: "var(--kk-faint)" }}>
              Laissez vide pour utiliser le défaut de la plateforme ({Number(settings?.defaultCommissionPercent ?? 20)}%).
              Un changement redemandera l&apos;acceptation des conditions au thérapeute.
            </p>
            {error === "commission" && <div className="kk-error mb-3">Pourcentage invalide (0 à 100).</div>}
            <form action={updateTherapistCommissionAction} className="flex items-center gap-2">
              <input type="hidden" name="therapistId" value={String(userId)} />
              <input
                type="number"
                name="commissionPercent"
                min={0}
                max={100}
                step={0.5}
                defaultValue={t.commissionPercent != null ? Number(t.commissionPercent) : ""}
                placeholder={`${Number(settings?.defaultCommissionPercent ?? 20)} (défaut)`}
                className="kk-input flex-1"
              />
              <span className="text-sm font-bold" style={{ color: "var(--kk-mid)" }}>%</span>
              <button type="submit" className="kk-btn-outline px-4 py-2 text-sm shrink-0">
                Enregistrer
              </button>
            </form>
          </div>
        )}

        {/* Primary actions — pending, réservé à l'admin */}
        {isPending && isAdmin && (
          <div className="flex gap-3 mb-4">
            <form action={verifyTherapist} className="flex-1">
              <input type="hidden" name="userId" value={String(userId)} />
              <button type="submit" className="kk-btn-green w-full py-4 text-base">
                ✓ Valider le compte
              </button>
            </form>
            <form action={rejectTherapist}>
              <input type="hidden" name="userId" value={String(userId)} />
              <ConfirmSubmitButton
                confirmMessage={`Rejeter la candidature de ${t.firstName} ${t.lastName} ?`}
                className="kk-btn-outline px-6 py-4 text-base"
                style={{ borderColor: "#FFCAC8", color: "#C0392B" }}
              >
                Rejeter
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
        {isPending && !isAdmin && (
          <div className="rounded-2xl p-4 mb-4 text-sm text-center" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold)" }}>
            Candidature en attente — seul un administrateur peut la valider ou la rejeter.
          </div>
        )}

        {isVerified && (
          <div className="rounded-2xl p-4 mb-4 text-sm text-center" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
            Ce psychologue est vérifié et peut consulter des patients.
          </div>
        )}

        {isRejected && !isSuspended && isAdmin && (
          <form action={verifyTherapist} className="mb-4">
            <input type="hidden" name="userId" value={String(userId)} />
            <button type="submit" className="kk-btn-green w-full py-3 text-sm">
              Reconsidérer et valider
            </button>
          </form>
        )}

        {/* Suspend / unsuspend — réservé à l'admin, visible pour vérifiés ou rejetés */}
        {isAdmin && (isVerified || isRejected || isSuspended) && (
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--kk-muted)" }}>GESTION DU COMPTE</p>
            {isSuspended ? (
              <form action={unsuspendUser}>
                <input type="hidden" name="userId" value={String(userId)} />
                <button type="submit" className="kk-btn-green w-full py-3 text-sm">
                  Lever la suspension
                </button>
              </form>
            ) : (
              <form action={suspendUser}>
                <input type="hidden" name="userId" value={String(userId)} />
                <ConfirmSubmitButton
                  confirmMessage={`Suspendre ${t.firstName} ${t.lastName} ? Ce praticien ne pourra plus se connecter ni être visible des patients.`}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "#FFF1F0", color: "#C0392B", border: "1px solid #FFCAC8" }}
                >
                  Suspendre ce praticien
                </ConfirmSubmitButton>
              </form>
            )}
            <p className="text-xs mt-2 text-center" style={{ color: "var(--kk-faint)" }}>
              Un compte suspendu ne peut plus se connecter ni être visible des patients.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <p className="text-xs font-bold w-28 shrink-0 pt-0.5" style={{ color: "var(--kk-muted)" }}>
        {label.toUpperCase()}
      </p>
      <p className="text-sm flex-1" style={{ color: "var(--kk-dark)" }}>{value}</p>
    </div>
  );
}
