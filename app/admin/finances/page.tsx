import { prisma } from "@/lib/prisma";
import { BarChart } from "@/components/charts/BarChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { lastMonths, bucketByMonth } from "@/lib/chartHelpers";

export const metadata = { title: "Finances — Administration K-Kouma" };

export default async function AdminFinancesPage() {
  const [payments, earnings, therapists] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { paidAt: "desc" },
      include: { patient: { select: { patientProfile: { select: { nickname: true } }, email: true } } },
    }),
    prisma.therapistEarning.findMany({
      include: {
        therapist: { select: { therapistProfile: { select: { firstName: true, lastName: true } }, email: true } },
      },
    }),
    prisma.therapistProfile.findMany({
      where: { isVerified: true },
      select: { userId: true, firstName: true, lastName: true },
    }),
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const margin = totalRevenue - totalEarnings;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueThisMonth = payments
    .filter((p) => p.paidAt && p.paidAt >= startOfMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Regroupe les gains par thérapeute
  const earningsByTherapist = new Map<number, { name: string; total: number; count: number }>();
  for (const t of therapists) {
    earningsByTherapist.set(t.userId, { name: `${t.firstName} ${t.lastName}`, total: 0, count: 0 });
  }
  for (const e of earnings) {
    const entry = earningsByTherapist.get(e.therapistId);
    if (entry) {
      entry.total += Number(e.amount);
      entry.count += 1;
    }
  }
  const therapistRows = Array.from(earningsByTherapist.values()).sort((a, b) => b.total - a.total);

  const months = lastMonths(6);
  const monthlyRevenue = bucketByMonth(
    payments.filter((p) => p.paidAt),
    (p) => p.paidAt as Date,
    (p) => Number(p.amount),
    months
  );
  const monthlyPayout = bucketByMonth(earnings, (e) => e.createdAt, (e) => Number(e.amount), months);

  const STATS = [
    { label: "Revenu total (payé)", value: totalRevenue, color: "var(--kk-green)", bg: "var(--kk-green-light)" },
    { label: "Ce mois-ci", value: revenueThisMonth, color: "var(--kk-purple)", bg: "var(--kk-purple-light)" },
    { label: "Reversé aux psychologues", value: totalEarnings, color: "var(--kk-gold)", bg: "var(--kk-gold-light)" },
    { label: "Marge plateforme", value: margin, color: "#2C342E", bg: "var(--kk-border)" },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Finances
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Vue d&apos;ensemble des paiements patients et des gains psychologues
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="kk-card p-5">
            <p className="font-bold text-2xl" style={{ color: stat.color, fontFamily: "var(--font-lora)" }}>
              {stat.value.toLocaleString("fr-FR")} <span className="text-sm">XOF</span>
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--kk-muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 mb-8" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
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

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Per-therapist breakdown */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Gains par psychologue
          </h2>
          {therapistRows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun gain enregistré.</p>
          ) : (
            <>
              <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
                <HorizontalBarChart
                  items={therapistRows.map((t) => ({ label: t.name, value: t.total }))}
                  color="#C58A3D"
                  ariaLabel="Classement des gains par psychologue"
                />
              </div>
              <div className="space-y-2">
              {therapistRows.map((t) => (
                <div
                  key={t.name}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {t.count} séance{t.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--kk-gold)" }}>
                    {t.total.toLocaleString("fr-FR")} XOF
                  </p>
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
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun paiement pour l&apos;instant.</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 15).map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                      {p.patient.patientProfile?.nickname ?? p.patient.email}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {p.paidAt?.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      {" · "}
                      {p.sessionsCount === 1 ? "1 séance" : `Pack ${p.sessionsCount}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--kk-green)" }}>
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
