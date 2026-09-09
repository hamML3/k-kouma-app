import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./_client";
import { suspendUserAction, reactivateUserAction } from "@/lib/actions/admin";

export const metadata = { title: "Utilisateurs — Administration K-Kouma" };

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: "Admin", bg: "var(--kk-purple-light)", color: "var(--kk-purple)" },
  therapist: { label: "Psychologue", bg: "var(--kk-gold-light)", color: "var(--kk-gold)" },
  patient: { label: "Patient", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const roleFilter = params.role;

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter as "admin" | "therapist" | "patient" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      patientProfile: { select: { nickname: true } },
      therapistProfile: { select: { firstName: true, lastName: true, isVerified: true } },
    },
  });

  const FILTERS = [
    { value: undefined, label: "Tous" },
    { value: "patient", label: "Patients" },
    { value: "therapist", label: "Psychologues" },
    { value: "admin", label: "Admins" },
  ];

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Utilisateurs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {users.length} compte{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateUserForm />
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => {
          const active = roleFilter === f.value;
          const href = f.value ? `/admin/users?role=${f.value}` : "/admin/users";
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

              <form action={suspended ? reactivateUserAction : suspendUserAction} className="shrink-0">
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="text-xs font-bold px-3.5 py-2 rounded-full"
                  style={
                    suspended
                      ? { background: "var(--kk-green-light)", color: "var(--kk-green)" }
                      : { background: "var(--kk-border)", color: "var(--kk-mid)" }
                  }
                >
                  {suspended ? "Réactiver" : "Suspendre"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
