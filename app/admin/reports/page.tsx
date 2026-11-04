import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { REPORT_CATEGORY_LABELS, type ReportCategory } from "@/lib/reportCategories";
import { reviewReportAction, dismissReportAction } from "@/lib/actions/reports";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { ReportStatus } from "@prisma/client";

export const metadata = { title: "Signalements — Administration K-Kouma" };

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "pending", label: "À examiner" },
  { value: "reviewed", label: "Traités" },
  { value: "dismissed", label: "Classés sans suite" },
  { value: "all", label: "Tous" },
];

type IdentitySelect = {
  email: string;
  role: string;
  patientProfile: { nickname: string } | null;
  therapistProfile: { firstName: string; lastName: string } | null;
} | null;

function identity(u: IdentitySelect): { name: string; roleLabel: string; email: string | null } {
  if (!u) return { name: "Compte supprimé", roleLabel: "", email: null };
  const name = u.patientProfile?.nickname ?? (u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : u.email);
  const roleLabel = u.role === "therapist" ? "Psychologue" : u.role === "patient" ? "Patient" : u.role;
  return { name, roleLabel, email: u.email };
}

/**
 * Contrairement à /admin/finances (lisible par tout modérateur, seules les
 * actions étant gardées par la permission), cette page est entièrement
 * réservée à l'admin ou au modérateur titulaire de `manage_reports` : le
 * contenu d'un signalement (allégations, parfois des détails de santé) est
 * plus sensible qu'une donnée financière et ne doit pas être visible par
 * défaut à n'importe quel modérateur.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const canManage = hasPermission(session?.user?.role, session?.user?.permissions, "manage_reports");
  if (!canManage) redirect("/admin");

  const { status: statusParam } = await searchParams;
  const status = (statusParam as ReportStatus | "all" | undefined) ?? "pending";

  const [reports, pendingCount] = await Promise.all([
    prisma.report.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: {
          select: {
            email: true,
            role: true,
            patientProfile: { select: { nickname: true } },
            therapistProfile: { select: { firstName: true, lastName: true } },
          },
        },
        reported: {
          select: {
            email: true,
            role: true,
            patientProfile: { select: { nickname: true } },
            therapistProfile: { select: { firstName: true, lastName: true } },
          },
        },
        reviewedBy: { select: { email: true } },
      },
    }),
    prisma.report.count({ where: { status: "pending" } }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Signalements
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          {pendingCount > 0
            ? `${pendingCount} signalement${pendingCount > 1 ? "s" : ""} à examiner.`
            : "Aucun signalement en attente."}{" "}
          Pour agir sur un compte (suspendre, vérifier…), rendez-vous sur sa fiche depuis les liens ci-dessous.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <Link
              key={t.value}
              href={`/admin/reports?status=${t.value}`}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
              style={{
                background: active ? "var(--kk-purple)" : "#fff",
                color: active ? "#fff" : "var(--kk-mid)",
                border: active ? "none" : "1.5px solid var(--kk-border-mid)",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {reports.length === 0 ? (
        <div className="kk-card p-10 text-center">
          <p className="text-2xl mb-2" aria-hidden>
            🌿
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
            Rien à signaler ici pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const reporter = identity(r.reporter);
            const reported = identity(r.reported);
            const categoryLabel = REPORT_CATEGORY_LABELS[r.category as ReportCategory] ?? r.category;
            const accountHref = r.reported.role === "therapist" ? `/admin/therapists/${r.reportedId}` : "/admin/users";

            return (
              <div key={r.id} className="kk-card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                      {reporter.name}{" "}
                      <span className="font-normal" style={{ color: "var(--kk-muted)" }}>
                        ({reporter.roleLabel})
                      </span>{" "}
                      a signalé{" "}
                      <span style={{ color: "var(--kk-purple-text)" }}>{reported.name}</span>{" "}
                      <span className="font-normal" style={{ color: "var(--kk-muted)" }}>
                        ({reported.roleLabel})
                      </span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--kk-faint)" }}>
                      {r.createdAt.toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {r.appointmentId && <> · rendez-vous #{r.appointmentId}</>}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={
                      r.status === "pending"
                        ? { background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }
                        : r.status === "reviewed"
                        ? { background: "var(--kk-green-light)", color: "var(--kk-green-text)" }
                        : { background: "var(--kk-border)", color: "var(--kk-mid)" }
                    }
                  >
                    {r.status === "pending" ? "À examiner" : r.status === "reviewed" ? "Traité" : "Classé sans suite"}
                  </span>
                </div>

                <div className="rounded-xl p-3 mb-3" style={{ background: "var(--kk-bg)" }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--kk-muted)" }}>
                    {categoryLabel}
                  </p>
                  {r.message && (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--kk-dark)" }}>
                      {r.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Link href={accountHref} className="text-xs font-semibold" style={{ color: "var(--kk-purple-text)" }}>
                    Voir le compte signalé →
                  </Link>

                  {r.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <form action={dismissReportAction}>
                        <input type="hidden" name="reportId" value={r.id} />
                        <ConfirmSubmitButton
                          confirmMessage="Classer ce signalement sans suite ?"
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-border-mid)]"
                          style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                        >
                          Classer sans suite
                        </ConfirmSubmitButton>
                      </form>
                      <form action={reviewReportAction}>
                        <input type="hidden" name="reportId" value={r.id} />
                        <button
                          type="submit"
                          className="text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-green-hover)]"
                          style={{ background: "var(--kk-green)", color: "#fff" }}
                        >
                          Marquer traité
                        </button>
                      </form>
                    </div>
                  )}
                  {r.status !== "pending" && r.reviewedBy && (
                    <p className="text-xs" style={{ color: "var(--kk-faint)" }}>
                      Par {r.reviewedBy.email}
                      {r.reviewedAt && ` · ${r.reviewedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
