import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { splitSpecialties } from "@/lib/specialties";
import { documentHref } from "@/lib/therapistDocuments";

export default async function AdminTherapistsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const session = await auth();
  const canManageTherapists = hasPermission(session?.user?.role, session?.user?.permissions, "manage_therapists");

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
    { id: "pending",   label: `En attente (${pending.length})`,   color: "var(--kk-gold-text)" },
    { id: "verified",  label: `Vérifiés (${verified.length})`,    color: "var(--kk-green-text)" },
    { id: "rejected",  label: `Rejetés (${rejected.length})`,     color: "#C0392B" },
    { id: "suspended", label: `Suspendus (${suspended.length})`,  color: "var(--kk-muted)" },
  ];

  const list = tab === "verified" ? verified : tab === "rejected" ? rejected : tab === "suspended" ? suspended : pending;

  return (
    <>
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold"
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
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/therapists?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150"
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
          <p className="text-3xl mb-2" aria-hidden>🍃</p>
          <p className="font-bold" style={{ color: "var(--kk-dark)" }}>
            Aucune candidature dans cette catégorie
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Revenez un peu plus tard, ou essayez un autre onglet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <div
              key={t.id}
              className="kk-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
            >
              {/* Avatar + info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)", fontFamily: "var(--font-lora)" }}
                  aria-hidden
                >
                  {t.firstName.charAt(0).toUpperCase()}
                  {t.lastName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="font-bold"
                      style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                    >
                      {t.firstName} {t.lastName}
                    </p>
                    {t.practitionerKind === "coach" && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}
                      >
                        Coach
                      </span>
                    )}
                    {t.isVerified && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
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
                      {splitSpecialties(t.specialties).join(", ")}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--kk-faint)" }}>
                    Inscrit le {new Date(t.user.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Diploma badge + action */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {!canManageTherapists ? null : t.diplomaUrl ? (
                  <a
                    href={documentHref(t.diplomaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors hover:bg-[var(--kk-purple)] hover:text-white"
                    style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
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

                <Link
                  href={`/admin/therapists/${t.user.id}`}
                  className="shrink-0 kk-btn-outline text-sm px-4 py-2"
                >
                  Examiner →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
