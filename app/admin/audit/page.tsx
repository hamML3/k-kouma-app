import { prisma } from "@/lib/prisma";

export const metadata = { title: "Journal d'audit — Administration K-Kouma" };

const ACTION_INFO: Record<string, { label: string; bg: string; color: string }> = {
  "admin.user.create": { label: "Compte créé par un admin", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  "admin.user.suspend": { label: "Compte suspendu", bg: "#FFF1F0", color: "#C0392B" },
  "admin.user.reactivate": { label: "Compte réactivé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.therapist.suspend": { label: "Psychologue suspendu", bg: "#FFF1F0", color: "#C0392B" },
  "admin.therapist.unsuspend": { label: "Psychologue réactivé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.therapist.verify": { label: "Psychologue validé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
  "admin.therapist.reject": { label: "Psychologue rejeté", bg: "#FFF1F0", color: "#C0392B" },
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

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;

  const entries = await prisma.auditLog.findMany({
    where: category ? { action: { startsWith: `${category}.` } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Journal d&apos;audit
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Les {entries.length} dernières actions enregistrées — comptes, validations de psychologues, connexions.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => {
          const active = category === c.value;
          const href = c.value ? `/admin/audit?category=${c.value}` : "/admin/audit";
          return (
            <a
              key={c.label}
              href={href}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
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

      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        {entries.length === 0 ? (
          <p className="text-sm p-6 text-center" style={{ color: "var(--kk-muted)" }}>
            Aucune action enregistrée pour le moment.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--kk-border)" }}>
            {entries.map((e) => {
              const info = ACTION_INFO[e.action] ?? { label: e.action, bg: "var(--kk-border)", color: "var(--kk-mid)" };
              return (
                <div key={e.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
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
                    <p className="text-xs" style={{ color: "var(--kk-muted)" }}>
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
