import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BarChart } from "@/components/charts/BarChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { lastMonths, bucketByMonth } from "@/lib/chartHelpers";
import { confirmManualPaymentAction, rejectManualPaymentAction, markTherapistPayoutAction } from "@/lib/actions/admin";
import { approvePayoutRequestAction, rejectPayoutRequestAction } from "@/lib/actions/payouts";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Finances — Administration K-Kouma" };

export default async function AdminFinancesPage() {
  const session = await auth();
  const canManageFinances = hasPermission(session?.user?.role, session?.user?.permissions, "manage_finances");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = lastMonths(6);

  // Totaux calculés par la base : seules la liste récente et les 6 mois des
  // graphiques sont chargés, pour que la page tienne avec le volume.
  const [
    payments,
    revenue,
    monthRevenue,
    chartPayments,
    earningGroups,
    chartEarnings,
    therapists,
    pendingManualPayments,
    pendingPayoutRequests,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { paidAt: "desc" },
      take: 15,
      include: { patient: { select: { patientProfile: { select: { nickname: true } }, email: true } } },
    }),
    prisma.payment.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "completed", paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.payment.findMany({
      where: { status: "completed", paidAt: { gte: months[0].start } },
      select: { paidAt: true, amount: true },
    }),
    prisma.therapistEarning.groupBy({
      by: ["therapistId", "paidOut"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.therapistEarning.findMany({
      where: { createdAt: { gte: months[0].start } },
      select: { createdAt: true, amount: true },
    }),
    prisma.therapistProfile.findMany({
      where: { isVerified: true },
      select: { userId: true, firstName: true, lastName: true },
    }),
    prisma.payment.findMany({
      where: { status: "pending", provider: "orange_money_manual" },
      orderBy: { createdAt: "asc" },
      include: { patient: { select: { patientProfile: { select: { nickname: true } }, email: true } } },
    }),
    prisma.payoutRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        therapist: { select: { therapistProfile: { select: { firstName: true, lastName: true } }, email: true } },
      },
    }),
  ]);

  const totalRevenue = Number(revenue._sum.amount ?? 0);
  const totalEarnings = earningGroups.reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);
  const margin = totalRevenue - totalEarnings;
  const revenueThisMonth = Number(monthRevenue._sum.amount ?? 0);

  // Regroupe les gains par thérapeute, en distinguant ce qui a déjà été reversé
  const earningsByTherapist = new Map<
    number,
    { therapistId: number; name: string; total: number; count: number; unpaid: number }
  >();
  for (const t of therapists) {
    earningsByTherapist.set(t.userId, { therapistId: t.userId, name: `${t.firstName} ${t.lastName}`, total: 0, count: 0, unpaid: 0 });
  }
  for (const g of earningGroups) {
    const entry = earningsByTherapist.get(g.therapistId);
    if (entry) {
      const amount = Number(g._sum.amount ?? 0);
      entry.total += amount;
      entry.count += g._count._all;
      if (!g.paidOut) entry.unpaid += amount;
    }
  }
  const therapistRows = Array.from(earningsByTherapist.values()).sort((a, b) => b.total - a.total);
  const totalUnpaid = therapistRows.reduce((sum, t) => sum + t.unpaid, 0);

  const monthlyRevenue = bucketByMonth(
    chartPayments,
    (p) => p.paidAt as Date,
    (p) => Number(p.amount),
    months
  );
  const monthlyPayout = bucketByMonth(chartEarnings, (e) => e.createdAt, (e) => Number(e.amount), months);

  const STATS = [
    { label: "Revenu total (payé)", value: totalRevenue, color: "var(--kk-green)", bg: "var(--kk-green-light)", icon: "💰" },
    { label: "Ce mois-ci", value: revenueThisMonth, color: "var(--kk-purple)", bg: "var(--kk-purple-light)", icon: "📅" },
    { label: "Gagné par les psychologues", value: totalEarnings, color: "var(--kk-gold)", bg: "var(--kk-gold-light)", icon: "🩺" },
    { label: "Dont à reverser", value: totalUnpaid, color: "#C0392B", bg: "#FFF1F0", icon: "⏳" },
    { label: "Marge plateforme", value: margin, color: "#2C342E", bg: "var(--kk-border)", icon: "📊" },
  ];

  return (
    <>
      <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Finances
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Vue d&apos;ensemble des paiements patients et des gains psychologues
          </p>
        </div>
        {canManageFinances && (
          <div className="flex gap-2 flex-wrap">
            <a href="/api/admin/export/payments" className="kk-btn-outline">
              Exporter paiements (CSV)
            </a>
            <a href="/api/admin/export/earnings" className="kk-btn-outline">
              Exporter gains (CSV)
            </a>
          </div>
        )}
      </div>

      {pendingManualPayments.length > 0 && (
        <div className="mb-8 sm:mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-gold)" }}>
            Paiements Orange Money à vérifier ({pendingManualPayments.length})
          </h2>
          <div className="space-y-2">
            {pendingManualPayments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ background: "#fff", border: "1.5px solid #E9C98A" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                    {p.patient.patientProfile?.nickname ?? p.patient.email}
                    <span className="font-normal" style={{ color: "var(--kk-mid)" }}>
                      {" "}· {Number(p.amount).toLocaleString("fr-FR")} {p.currency} ·{" "}
                      {p.sessionsCount === 1 ? "1 séance" : `Pack ${p.sessionsCount}`}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                    Réf. <strong>{p.providerRef}</strong> · envoyé depuis {p.payerPhone} ·{" "}
                    {p.createdAt.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {canManageFinances && (
                  <div className="flex gap-2 shrink-0">
                    <form action={rejectManualPaymentAction} className="flex-1 sm:flex-none">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <ConfirmSubmitButton
                        confirmMessage="Rejeter cette déclaration de paiement ? Aucune séance ne sera créditée."
                        className="w-full text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-border-mid)]"
                        style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                      >
                        Rejeter
                      </ConfirmSubmitButton>
                    </form>
                    <form action={confirmManualPaymentAction} className="flex-1 sm:flex-none">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <button
                        type="submit"
                        className="w-full text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-green-hover)]"
                        style={{ background: "var(--kk-green)", color: "#fff" }}
                      >
                        Valider et créditer
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingPayoutRequests.length > 0 && (
        <div className="mb-8 sm:mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-gold)" }}>
            Demandes de retrait à traiter ({pendingPayoutRequests.length})
          </h2>
          <div className="space-y-2">
            {pendingPayoutRequests.map((r) => {
              const therapistName = r.therapist.therapistProfile
                ? `${r.therapist.therapistProfile.firstName} ${r.therapist.therapistProfile.lastName}`
                : r.therapist.email;
              return (
                <div
                  key={r.id}
                  className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{ background: "#fff", border: "1.5px solid #E9C98A" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                      {therapistName}
                      <span className="font-normal" style={{ color: "var(--kk-mid)" }}>
                        {" "}· {Number(r.amount).toLocaleString("fr-FR")} XOF
                      </span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {r.therapist.email} · demandé le{" "}
                      {r.createdAt.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {canManageFinances && (
                    <div className="flex gap-2 shrink-0">
                      <form action={rejectPayoutRequestAction} className="flex-1 sm:flex-none">
                        <input type="hidden" name="requestId" value={r.id} />
                        <ConfirmSubmitButton
                          confirmMessage="Rejeter cette demande de retrait ? Les gains du psychologue ne seront pas marqués reversés."
                          className="w-full text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-border-mid)]"
                          style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                        >
                          Rejeter
                        </ConfirmSubmitButton>
                      </form>
                      <form action={approvePayoutRequestAction} className="flex-1 sm:flex-none">
                        <input type="hidden" name="requestId" value={r.id} />
                        <ConfirmSubmitButton
                          confirmMessage={`Approuver et reverser ${Number(r.amount).toLocaleString("fr-FR")} XOF à ${therapistName} ?`}
                          className="w-full text-xs font-bold px-3.5 py-2 rounded-full transition-colors hover:bg-[var(--kk-green-hover)]"
                          style={{ background: "var(--kk-green)", color: "#fff" }}
                        >
                          Approuver
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="kk-card p-4 sm:p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base mb-2"
              style={{ background: stat.bg }}
              aria-hidden
            >
              {stat.icon}
            </div>
            <p className="font-bold text-xl sm:text-2xl" style={{ color: stat.color, fontFamily: "var(--font-lora)" }}>
              {stat.value.toLocaleString("fr-FR")} <span className="text-sm">XOF</span>
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--kk-muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 mb-8 overflow-x-auto" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kk-dark)" }}>
          Revenu vs reversé aux psychologues — 6 derniers mois
        </h2>
        <BarChart
          categories={months.map((m) => m.label)}
          series={[
            { key: "revenue", label: "Revenu encaissé", color: "#2F8F5B", values: monthlyRevenue },
            { key: "payout", label: "Reversé aux psychologues", color: "#7A5FB0", values: monthlyPayout },
          ]}
          ariaLabel="Revenu encaissé et montant reversé aux psychologues sur les 6 derniers mois"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Per-therapist breakdown */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Gains par psychologue
          </h2>
          {therapistRows.length === 0 ? (
            <div className="kk-card p-6 text-center">
              <p className="text-2xl mb-1" aria-hidden>🌱</p>
              <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun gain enregistré pour l&apos;instant.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl p-4 mb-4 overflow-x-auto" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
                <HorizontalBarChart
                  items={therapistRows.map((t) => ({ label: t.name, value: t.total }))}
                  color="#C58A3D"
                  ariaLabel="Classement des gains par psychologue"
                />
              </div>
              <div className="space-y-2">
              {therapistRows.map((t) => (
                <div
                  key={t.therapistId}
                  className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {t.count} séance{t.count !== 1 ? "s" : ""} ·{" "}
                      {t.unpaid > 0 ? (
                        <span style={{ color: "#C0392B", fontWeight: 700 }}>
                          {t.unpaid.toLocaleString("fr-FR")} XOF à reverser
                        </span>
                      ) : (
                        <span style={{ color: "var(--kk-green)", fontWeight: 700 }}>Tout reversé ✓</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-bold" style={{ color: "var(--kk-gold)" }}>
                      {t.total.toLocaleString("fr-FR")} XOF
                    </p>
                    {t.unpaid > 0 && canManageFinances && (
                      <form action={markTherapistPayoutAction}>
                        <input type="hidden" name="therapistId" value={t.therapistId} />
                        <ConfirmSubmitButton
                          confirmMessage={`Marquer ${t.unpaid.toLocaleString("fr-FR")} XOF comme reversés à ${t.name} ?`}
                          className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--kk-green)] hover:text-white"
                          style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
                        >
                          Marquer reversé
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>

        {/* Recent payments */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Paiements récents
          </h2>
          {payments.length === 0 ? (
            <div className="kk-card p-6 text-center">
              <p className="text-2xl mb-1" aria-hidden>🌱</p>
              <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun paiement pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--kk-dark)" }}>
                      {p.patient.patientProfile?.nickname ?? p.patient.email}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {p.paidAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      {" · "}
                      {p.sessionsCount === 1 ? "1 séance" : `Pack ${p.sessionsCount}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: "var(--kk-green)" }}>
                    {Number(p.amount).toLocaleString("fr-FR")} {p.currency}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
