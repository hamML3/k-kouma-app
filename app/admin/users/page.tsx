import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./_client";
import { suspendUserAction, reactivateUserAction } from "@/lib/actions/admin";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Utilisateurs — Administration K-Kouma" };

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: "Admin", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  moderator: { label: "Modérateur", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  therapist: { label: "Psychologue", bg: "var(--kk-gold-light)", color: "var(--kk-gold)" },
  patient: { label: "Patient", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
};

const PAGE_SIZE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const params = await searchParams;
  const roleFilter = params.role;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = {
    ...(roleFilter ? { role: roleFilter as "admin" | "therapist" | "patient" | "moderator" } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { patientProfile: { nickname: { contains: q } } },
            { therapistProfile: { firstName: { contains: q } } },
            { therapistProfile: { lastName: { contains: q } } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        patientProfile: { select: { nickname: true } },
        therapistProfile: { select: { firstName: true, lastName: true, isVerified: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const FILTERS = [
    { value: undefined, label: "Tous" },
    { value: "patient", label: "Patients" },
    { value: "therapist", label: "Psychologues" },
    { value: "moderator", label: "Modérateurs" },
    { value: "admin", label: "Admins" },
  ];

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (roleFilter) sp.set("role", roleFilter);
    if (q) sp.set("q", q);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Utilisateurs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {total} compte{total !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && <CreateUserForm />}
      </div>

      <form action="/admin/users" method="get" className="mb-4">
        {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par email ou nom…"
          className="kk-input max-w-sm"
        />
      </form>

      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => {
          const active = roleFilter === f.value;
          const sp = new URLSearchParams();
          if (f.value) sp.set("role", f.value);
          if (q) sp.set("q", q);
          const qs = sp.toString();
          const href = qs ? `/admin/users?${qs}` : "/admin/users";
          return (
            <a
              key={f.label}
              href={href}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: active ? "var(--kk-green)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {f.label}
            </a>
          );
        })}
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun compte ne correspond à cette recherche.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.patient;
            const name =
              u.patientProfile?.nickname ??
              (u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : null);
            const suspended = u.status === "suspended";

            return (
              <div
                key={u.id}
                className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
                style={{ background: "#fff", border: "1px solid var(--kk-border)", opacity: suspended ? 0.65 : 1 }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                      {name ?? u.email}
                    </p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: roleInfo.bg, color: roleInfo.color }}
                    >
                      {roleInfo.label}
                    </span>
                    {suspended && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#FFF1F0", color: "#C0392B" }}>
                        Suspendu
                      </span>
                    )}
                    {u.therapistProfile && !u.therapistProfile.isVerified && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold)" }}>
                        Non vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                    {u.email} · Inscrit le {u.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>

                {isAdmin && (
                  <form action={suspended ? reactivateUserAction : suspendUserAction} className="shrink-0">
                    <input type="hidden" name="userId" value={u.id} />
                    {suspended ? (
                      <button
                        type="submit"
                        className="text-xs font-bold px-3.5 py-2 rounded-full"
                        style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
                      >
                        Réactiver
                      </button>
                    ) : (
                      <ConfirmSubmitButton
                        confirmMessage={`Suspendre le compte de ${name ?? u.email} ? Cette personne ne pourra plus se connecter.`}
                        className="text-xs font-bold px-3.5 py-2 rounded-full"
                        style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                      >
                        Suspendre
                      </ConfirmSubmitButton>
                    )}
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <a
            href={page > 1 ? pageHref(page - 1) : undefined}
            aria-disabled={page <= 1}
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{
              background: "#fff",
              border: "1.5px solid var(--kk-border-mid)",
              color: page > 1 ? "var(--kk-mid)" : "var(--kk-faint)",
              pointerEvents: page > 1 ? "auto" : "none",
            }}
          >
            ← Précédent
          </a>
          <span className="text-xs font-semibold" style={{ color: "var(--kk-muted)" }}>
            Page {page} / {totalPages}
          </span>
          <a
            href={page < totalPages ? pageHref(page + 1) : undefined}
            aria-disabled={page >= totalPages}
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{
              background: "#fff",
              border: "1.5px solid var(--kk-border-mid)",
              color: page < totalPages ? "var(--kk-mid)" : "var(--kk-faint)",
              pointerEvents: page < totalPages ? "auto" : "none",
            }}
          >
            Suivant →
          </a>
        </div>
      )}
    </>
  );
}
