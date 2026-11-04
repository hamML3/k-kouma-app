import { prisma } from "@/lib/prisma";
import { BarChart } from "@/components/charts/BarChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { lastMonths, bucketByMonth } from "@/lib/chartHelpers";
import { confirmManualPaymentAction, rejectManualPaymentAction, markTherapistPayoutAction } from "@/lib/actions/admin";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const metadata = { title: "Finances — Administration K-Kouma" };

export default async function AdminFinancesPage() {
  const [payments, earnings, therapists, pendingManualPayments] = await Promise.all([
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
    prisma.payment.findMany({
      where: { status: "pending", provider: "orange_money_manual" },
      orderBy: { createdAt: "asc" },
      include: { patient: { select: { patientProfile: { select: { nickname: true } }, email: true } } },
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

  // Regroupe les gains par thérapeute, en distinguant ce qui a déjà été reversé
  const earningsByTherapist = new Map<
    number,
    { therapistId: number; name: string; total: number; count: number; unpaid: number }
  >();
  for (const t of therapists) {
    earningsByTherapist.set(t.userId, { therapistId: t.userId, name: `${t.firstName} ${t.lastName}`, total: 0, count: 0, unpaid: 0 });
  }
  for (const e of earnings) {
    const entry = earningsByTherapist.get(e.therapistId);
    if (entry) {
      entry.total += Number(e.amount);
      entry.count += 1;
      if (!e.paidOut) entry.unpaid += Number(e.amount);
    }
  }
  const therapistRows = Array.from(earningsByTherapist.values()).sort((a, b) => b.total - a.total);
  const totalUnpaid = therapistRows.reduce((sum, t) => sum + t.unpaid, 0);

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
    { label: "Gagné par les psychologues", value: totalEarnings, color: "var(--kk-gold)", bg: "var(--kk-gold-light)" },
    { label: "Dont à reverser", value: totalUnpaid, color: "#C0392B", bg: "#FFF1F0" },
    { label: "Marge plateforme", value: margin, color: "#2C342E", bg: "var(--kk-border)" },
  ];

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Finances
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Vue d&apos;ensemble des paiements patients et des gains psychologues
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/api/admin/export/payments" className="kk-btn-outline">
            Exporter paiements (CSV)
          </a>
          <a href="/api/admin/export/earnings" className="kk-btn-outline">
            Exporter gains (CSV)
          </a>
        </div>
      </div>

      {pendingManualPayments.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-gold)" }}>
            Paiements Orange Money à vérifier ({pendingManualPayments.length})
          </h2>
          <div className="space-y-2">
            {pendingManualPayments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
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
                <div className="flex gap-2 shrink-0">
                  <form action={rejectManualPaymentAction}>
                    <input type="hidden" name="paymentId" value={p.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Rejeter cette déclaration de paiement ? Aucune séance ne sera créditée."
                      className="text-xs font-bold px-3.5 py-2 rounded-full"
                      style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                    >
                      Rejeter
                    </ConfirmSubmitButton>
                  </form>
                  <form action={confirmManualPaymentAction}>
                    <input type="hidden" name="paymentId" value={p.id} />
                    <button
                      type="submit"
                      className="text-xs font-bold px-3.5 py-2 rounded-full"
                      style={{ background: "var(--kk-green)", color: "#fff" }}
                    >
                      Valider et créditer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
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
                  key={t.therapistId}
                  className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
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
                    {t.unpaid > 0 && (
                      <form action={markTherapistPayoutAction}>
                        <input type="hidden" name="therapistId" value={t.therapistId} />
                        <ConfirmSubmitButton
                          confirmMessage={`Marquer ${t.unpaid.toLocaleString("fr-FR")} XOF comme reversés à ${t.name} ?`}
                          className="text-xs font-bold px-3 py-1.5 rounded-full"
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
