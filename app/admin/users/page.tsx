import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./_client";
import { suspendUserAction, reactivateUserAction, updateModeratorPermissionsAction } from "@/lib/actions/admin";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { PERMISSIONS, PERMISSION_LABELS, hasPermission, normalizePermissions } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Utilisateurs — Administration K-Kouma" };

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: "Admin", bg: "var(--kk-purple-light)", color: "var(--kk-purple-text)" },
  moderator: { label: "Modérateur", bg: "var(--kk-purple-light)", color: "var(--kk-purple-text)" },
  therapist: { label: "Psychologue", bg: "var(--kk-gold-light)", color: "var(--kk-gold-text)" },
  patient: { label: "Patient", bg: "var(--kk-green-light)", color: "var(--kk-green-text)" },
};

const PAGE_SIZE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string; email?: string }>;
}) {
  const session = await auth();
  // isAdmin : seul un véritable admin peut créer un compte admin/modérateur
  // et accorder/retirer des permissions — ces deux pouvoirs-là restent
  // volontairement non délégables (lib/actions/admin.ts).
  const isAdmin = session?.user?.role === "admin";
  const canManageUsers = hasPermission(session?.user?.role, session?.user?.permissions, "manage_users");

  const params = await searchParams;
  const roleFilter = params.role;
  // Filtre sur la vérification de l'adresse e-mail : "verifie" ou "non-verifie".
  const emailFilter = params.email === "verifie" || params.email === "non-verifie" ? params.email : undefined;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = {
    ...(roleFilter ? { role: roleFilter as "admin" | "therapist" | "patient" | "moderator" } : {}),
    ...(emailFilter ? { emailVerifiedAt: emailFilter === "verifie" ? { not: null } : null } : {}),
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
        emailVerifiedAt: true,
        permissions: true,
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
    if (emailFilter) sp.set("email", emailFilter);
    if (q) sp.set("q", q);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  // Exporte l'intégralité des comptes correspondant aux filtres actifs
  // (pas seulement la page affichée) — mêmes paramètres role/q, sans pagination.
  function exportHref() {
    const sp = new URLSearchParams();
    if (roleFilter) sp.set("role", roleFilter);
    if (emailFilter) sp.set("email", emailFilter);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/api/admin/export/users?${qs}` : "/api/admin/export/users";
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Utilisateurs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {total} compte{total !== 1 ? "s" : ""} sur la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportHref()} className="kk-btn-outline">
            Exporter CSV
          </a>
          {canManageUsers && <CreateUserForm isAdmin={isAdmin} />}
        </div>
      </div>

      <form action="/admin/users" method="get" className="mb-4">
        {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
        {emailFilter && <input type="hidden" name="email" value={emailFilter} />}
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
          if (emailFilter) sp.set("email", emailFilter);
          if (q) sp.set("q", q);
          const qs = sp.toString();
          const href = qs ? `/admin/users?${qs}` : "/admin/users";
          return (
            <a
              key={f.label}
              href={href}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
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

      <div className="flex gap-2 flex-wrap mb-6 -mt-3">
        {[
          { value: undefined, label: "Tous les e-mails" },
          { value: "verifie", label: "E-mail vérifié" },
          { value: "non-verifie", label: "E-mail non vérifié" },
        ].map((f) => {
          const active = emailFilter === f.value;
          const sp = new URLSearchParams();
          if (roleFilter) sp.set("role", roleFilter);
          if (f.value) sp.set("email", f.value);
          if (q) sp.set("q", q);
          const qs = sp.toString();
          return (
            <a
              key={f.label}
              href={qs ? `/admin/users?${qs}` : "/admin/users"}
              className="px-3.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: active ? "var(--kk-purple)" : "#fff",
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
          <p className="text-2xl mb-2" aria-hidden>🔍</p>
          <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>Aucun compte ne correspond à cette recherche.</p>
          <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>Essayez un autre email, un autre nom, ou changez de filtre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.patient;
            const name =
              u.patientProfile?.nickname ??
              (u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : null);
            const suspended = u.status === "suspended";
            const grantedPermissions = normalizePermissions(u.permissions);
            const initial = (name ?? u.email).trim().charAt(0).toUpperCase();

            return (
              <div key={u.id}>
                <div
                  className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors hover:bg-[var(--kk-bg)]"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)", opacity: suspended ? 0.65 : 1 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: roleInfo.bg, color: roleInfo.color }}
                      aria-hidden
                    >
                      {initial}
                    </div>
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
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}>
                          Dossier à valider
                        </span>
                      )}
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        title={u.emailVerifiedAt ? `Vérifié le ${u.emailVerifiedAt.toLocaleDateString("fr-FR")}` : "Le lien de vérification n'a pas encore été ouvert"}
                        style={
                          u.emailVerifiedAt
                            ? { background: "var(--kk-green-light)", color: "var(--kk-green-text)" }
                            : { background: "#FFF1F0", color: "#9B2C20" }
                        }
                      >
                        {u.emailVerifiedAt ? "E-mail vérifié ✓" : "E-mail non vérifié"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--kk-muted)" }}>
                      {u.email} · Inscrit le {u.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  </div>

                  {canManageUsers && (
                    <form action={suspended ? reactivateUserAction : suspendUserAction} className="shrink-0 self-start sm:self-auto">
                      <input type="hidden" name="userId" value={u.id} />
                      {suspended ? (
                        <button
                          type="submit"
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-green)] hover:text-white"
                          style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
                        >
                          Réactiver
                        </button>
                      ) : (
                        <ConfirmSubmitButton
                          confirmMessage={`Suspendre le compte de ${name ?? u.email} ? Cette personne ne pourra plus se connecter.`}
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-border-mid)]"
                          style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                        >
                          Suspendre
                        </ConfirmSubmitButton>
                      )}
                    </form>
                  )}
                </div>

                {/* Permissions d'un compte modérateur — réservé au véritable admin (jamais délégable) */}
                {isAdmin && u.role === "moderator" && (
                  <form
                    action={updateModeratorPermissionsAction}
                    className="rounded-xl p-4 mt-1.5"
                    style={{ background: "var(--kk-purple-light)", border: "1px solid var(--kk-border)" }}
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--kk-purple-text)" }}>
                      ACCÈS ACCORDÉS À CE MODÉRATEUR
                    </p>
                    <div className="flex flex-wrap gap-4 mb-3">
                      {PERMISSIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--kk-mid)" }}>
                          <input type="checkbox" name={perm} defaultChecked={grantedPermissions.includes(perm)} />
                          {PERMISSION_LABELS[perm]}
                        </label>
                      ))}
                    </div>
                    <button type="submit" className="kk-btn-outline text-xs px-3.5 py-1.5">
                      Mettre à jour les permissions
                    </button>
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
