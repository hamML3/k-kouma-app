import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export default async function AdminTherapistsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "pending";
  const q = params.q?.trim();

  const searchFilter: Prisma.TherapistProfileWhereInput = q
    ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { user: { email: { contains: q } } }] }
    : {};

  const [pending, verified, rejected, suspended] = await Promise.all([
    prisma.therapistProfile.findMany({
      where: { isVerified: false, rejectedAt: null, user: { status: "active" }, ...searchFilter },
      include: { user: { select: { id: true, email: true, createdAt: true, status: true } } },
      orderBy: { user: { createdAt: "asc" } },
    }),
    prisma.therapistProfile.findMany({
      where: { isVerified: true, user: { status: "active" }, ...searchFilter },
      include: { user: { select: { id: true, email: true, createdAt: true, status: true } } },
      orderBy: { user: { createdAt: "desc" } },
      take: 30,
    }),
    prisma.therapistProfile.findMany({
      where: { rejectedAt: { not: null }, user: { status: { not: "suspended" } }, ...searchFilter },
      include: { user: { select: { id: true, email: true, createdAt: true, status: true } } },
      orderBy: { rejectedAt: "desc" },
      take: 30,
    }),
    prisma.therapistProfile.findMany({
      where: { user: { status: "suspended" }, ...searchFilter },
      include: { user: { select: { id: true, email: true, createdAt: true, status: true } } },
      orderBy: { user: { createdAt: "desc" } },
      take: 30,
    }),
  ]);

  const TABS = [
    { id: "pending",   label: `En attente (${pending.length})`,   color: "var(--kk-gold)" },
    { id: "verified",  label: `Vérifiés (${verified.length})`,    color: "var(--kk-green)" },
    { id: "rejected",  label: `Rejetés (${rejected.length})`,     color: "#C0392B" },
    { id: "suspended", label: `Suspendus (${suspended.length})`,  color: "var(--kk-muted)" },
  ];

  const list = tab === "verified" ? verified : tab === "rejected" ? rejected : tab === "suspended" ? suspended : pending;

  return (
    <>
      <div className="mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Psychologues
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Gérez les candidatures et les profils vérifiés
        </p>
      </div>

      <form action="/admin/therapists" method="get" className="mb-4">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou email…"
          className="kk-input max-w-sm"
        />
      </form>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/therapists?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="px-4 py-2 rounded-full text-sm font-bold transition-all"
            style={{
              background: tab === t.id ? t.color : "#fff",
              color: tab === t.id ? "#fff" : "var(--kk-mid)",
              border: tab === t.id ? "none" : "1.5px solid var(--kk-border-mid)",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
        >
          <p className="text-2xl mb-2">✓</p>
          <p className="font-bold" style={{ color: "var(--kk-dark)" }}>
            Aucune candidature dans cette catégorie
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <div
              key={t.id}
              className="kk-card p-5 flex items-center justify-between gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className="font-bold"
                    style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                  >
                    {t.firstName} {t.lastName}
                  </p>
                  {t.isVerified && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
                    >
                      ✓ Vérifié
                    </span>
                  )}
                  {t.rejectedAt && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#FFF1F0", color: "#C0392B" }}
                    >
                      Rejeté
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                  {t.user.email}
                </p>
                {t.specialties && (
                  <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
                    {t.specialties}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--kk-faint)" }}>
                  Inscrit le {new Date(t.user.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              {/* Diploma badge */}
              {t.diplomaUrl ? (
                <a
                  href={t.diplomaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                  style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10L6 2l4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3.5 7h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Diplôme
                </a>
              ) : (
                <span className="shrink-0 text-xs" style={{ color: "var(--kk-faint)" }}>
                  Pas de diplôme
                </span>
              )}

              {/* Action */}
              <Link
                href={`/admin/therapists/${t.user.id}`}
                className="shrink-0 kk-btn-outline text-sm px-4 py-2"
              >
                Examiner →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
