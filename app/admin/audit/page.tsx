import { prisma } from "@/lib/prisma";

export const metadata = { title: "Journal d'audit — Administration K-Kouma" };

const ACTION_INFO: Record<string, { label: string; bg: string; color: string }> = {
  "admin.user.create": { label: "Compte créé par un admin", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  "admin.user.suspend": { label: "Compte suspendu", bg: "#FFF1F0", color: "#C0392B" },
  "admin.user.reactivate": { label: "Compte réactivé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.user.permissions_update": { label: "Permissions modérateur modifiées", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  "admin.therapist.suspend": { label: "Psychologue suspendu", bg: "#FFF1F0", color: "#C0392B" },
  "admin.therapist.unsuspend": { label: "Psychologue réactivé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.therapist.verify": { label: "Psychologue validé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.therapist.reject": { label: "Psychologue rejeté", bg: "#FFF1F0", color: "#C0392B" },
  "admin.payment.confirm": { label: "Paiement manuel validé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.payment.reject": { label: "Paiement manuel rejeté", bg: "#FFF1F0", color: "#C0392B" },
  "admin.payout.mark_paid": { label: "Reversement marqué payé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "auth.login.success": { label: "Connexion réussie", bg: "var(--kk-border)", color: "var(--kk-mid)" },
  "auth.login.failed": { label: "Connexion échouée", bg: "var(--kk-gold-light)", color: "var(--kk-gold)" },
  "auth.password_reset.requested": { label: "Réinitialisation demandée", bg: "var(--kk-gold-light)", color: "var(--kk-gold)" },
  "auth.password_reset.completed": { label: "Mot de passe modifié", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
};

const CATEGORIES = [
  { value: undefined, label: "Tout" },
  { value: "admin", label: "Actions admin" },
  { value: "auth", label: "Authentification" },
];

const SINCE_OPTIONS = [
  { value: undefined, label: "Tout" },
  { value: "1", label: "24 h" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; since?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;
  const q = params.q?.trim();
  const since = params.since;

  const createdAtFilter = since
    ? { gte: new Date(new Date().getTime() - Number(since) * 24 * 60 * 60 * 1000) }
    : undefined;

  const entries = await prisma.auditLog.findMany({
    where: {
      ...(category ? { action: { startsWith: `${category}.` } } : {}),
      ...(q ? { actorEmail: { contains: q } } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  function withParams(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { category, q, since, ...overrides };
    if (merged.category) sp.set("category", merged.category);
    if (merged.q) sp.set("q", merged.q);
    if (merged.since) sp.set("since", merged.since);
    const qs = sp.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Journal d&apos;audit
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Les {entries.length} dernières actions enregistrées — comptes, validations de psychologues, connexions.
        </p>
      </div>

      <form action="/admin/audit" method="get" className="mb-4">
        {category && <input type="hidden" name="category" value={category} />}
        {since && <input type="hidden" name="since" value={since} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par email de l'auteur…"
          className="kk-input max-w-sm"
        />
      </form>

      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map((c) => {
          const active = category === c.value;
          return (
            <a
              key={c.label}
              href={withParams({ category: c.value })}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
              style={{
                background: active ? "var(--kk-green)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {c.label}
            </a>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {SINCE_OPTIONS.map((s) => {
          const active = since === s.value;
          return (
            <a
              key={s.label}
              href={withParams({ since: s.value })}
              className="px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                background: active ? "var(--kk-purple)" : "#fff",
                color: active ? "#fff" : "var(--kk-muted)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {s.label}
            </a>
          );
        })}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        {entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-2xl mb-2" aria-hidden>📜</p>
            <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>Aucune action enregistrée pour le moment.</p>
            <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>Les actions admin et les connexions apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--kk-border)" }}>
            {entries.map((e) => {
              const info = ACTION_INFO[e.action] ?? { label: e.action, bg: "var(--kk-border)", color: "var(--kk-mid)" };
              return (
                <div
                  key={e.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-l-4 transition-colors hover:bg-[var(--kk-bg)]"
                  style={{ borderLeftColor: info.color }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: info.bg, color: info.color }}
                      >
                        {info.label}
                      </span>
                      {e.targetType && e.targetId && (
                        <span className="text-xs" style={{ color: "var(--kk-faint)" }}>
                          {e.targetType} #{e.targetId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--kk-muted)" }}>
                      {e.actorEmail ?? "Système / anonyme"}
                      {e.ip ? ` · ${e.ip}` : ""}
                    </p>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: "var(--kk-faint)" }}>
                    {e.createdAt.toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
