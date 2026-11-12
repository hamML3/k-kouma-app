import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BarChart } from "@/components/charts/BarChart";
import { lastMonths, bucketByMonth } from "@/lib/chartHelpers";
import { PayoutPhoneForm, RequestPayoutSection } from "./_client";

export const metadata = { title: "Mes gains — K-Kouma" };

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const therapistId = Number(session.user.id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = lastMonths(6);

  const [earnings, pendingPayoutRequest, allTime, unpaid, thisMonth, chartRows, profile, payouts] = await Promise.all([
    prisma.therapistEarning.findMany({
      where: { therapistId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        appointment: {
          select: {
            scheduledAt: true,
            type: true,
            patient: { select: { patientProfile: { select: { nickname: true } }, email: true } },
          },
        },
      },
    }),
    prisma.payoutRequest.findFirst({
      where: { therapistId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    // Totaux calculés par la base : la liste ci-dessus est limitée à l'affichage.
    prisma.therapistEarning.aggregate({ where: { therapistId }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.therapistEarning.aggregate({ where: { therapistId, paidOut: false }, _sum: { amount: true } }),
    prisma.therapistEarning.aggregate({
      where: { therapistId, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.therapistEarning.findMany({
      where: { therapistId, createdAt: { gte: months[0].start } },
      select: { createdAt: true, amount: true },
    }),
    prisma.therapistProfile.findUnique({ where: { userId: therapistId }, select: { payoutPhone: true } }),
    prisma.therapistPayout.findMany({
      where: { therapistId },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, amount: true, currency: true, phone: true, reference: true, createdAt: true, _count: { select: { earnings: true } } },
    }),
  ]);

  const total = Number(allTime._sum.amount ?? 0);
  const totalCount = allTime._count._all;
  const unpaidTotal = Number(unpaid._sum.amount ?? 0);
  const thisMonthTotal = Number(thisMonth._sum.amount ?? 0);
  const thisMonthCount = thisMonth._count._all;

  const TYPE_LABELS: Record<string, string> = { video: "Vidéo", audio: "Audio", text: "Messagerie" };

  const monthlyTotals = bucketByMonth(chartRows, (e) => e.createdAt, (e) => Number(e.amount), months);

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Mes gains
        </h1>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#fff", border: "2px solid var(--kk-green)", boxShadow: "0 6px 24px rgba(85,123,83,0.10)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green-text)" }}>
              Ce mois-ci
            </p>
            <p className="font-bold text-3xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {thisMonthTotal.toLocaleString("fr-FR")} <span className="text-lg">XOF</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
              {thisMonthCount} séance{thisMonthCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-muted)" }}>
              Total cumulé
            </p>
            <p className="font-bold text-3xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {total.toLocaleString("fr-FR")} <span className="text-lg">XOF</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
              {totalCount} séance{totalCount !== 1 ? "s" : ""} réalisée{totalCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: unpaidTotal > 0 ? "#FFF1F0" : "var(--kk-green-light)", border: "1.5px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: unpaidTotal > 0 ? "#C0392B" : "var(--kk-green)" }}>
              À reverser
            </p>
            <p className="font-bold text-3xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {unpaidTotal.toLocaleString("fr-FR")} <span className="text-lg">XOF</span>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
              {unpaidTotal > 0 ? "En attente de reversement" : "Tout a été reversé"}
            </p>
          </div>
        </div>

        <PayoutPhoneForm initialPhone={profile?.payoutPhone ?? null} />

        <RequestPayoutSection
          unpaidTotal={unpaidTotal}
          hasPayoutPhone={Boolean(profile?.payoutPhone)}
          initialPendingRequest={
            pendingPayoutRequest
              ? { amount: Number(pendingPayoutRequest.amount), createdAt: pendingPayoutRequest.createdAt.toISOString() }
              : null
          }
        />

        <div className="rounded-2xl p-5 mb-8" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kk-dark)" }}>
            Gains des 6 derniers mois
          </h2>
          <BarChart
            categories={months.map((m) => m.label)}
            series={[{ key: "earnings", label: "Gains", color: "#2F8F5B", values: monthlyTotals }]}
            ariaLabel="Gains mensuels sur les 6 derniers mois"
            formatValue={(n) => n.toLocaleString("fr-FR")}
          />
        </div>

        {payouts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              Versements reçus
            </h2>
            <div className="space-y-2">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                      {p.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      <span className="font-normal" style={{ color: "var(--kk-muted)" }}>
                        {" "}· {p._count.earnings} séance{p._count.earnings > 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="text-xs mt-0.5 break-all" style={{ color: "var(--kk-muted)" }}>
                      Envoyé au {p.phone} · réf. <span className="font-mono">{p.reference}</span>
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: "var(--kk-green-text)" }}>
                    {Number(p.amount).toLocaleString("fr-FR")} {p.currency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
          Détail par séance
        </h2>

        {earnings.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
              Aucun gain pour l&apos;instant — il apparaîtra ici après votre première séance terminée.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {earnings.map((e) => {
              const patientName =
                e.appointment.patient.patientProfile?.nickname ?? e.appointment.patient.email;
              return (
                <div
                  key={e.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                      Avec {patientName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {new Date(e.appointment.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}
                      {TYPE_LABELS[e.appointment.type] ?? e.appointment.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: "var(--kk-green-text)" }}>
                      +{Number(e.amount).toLocaleString("fr-FR")} {e.currency}
                    </p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: e.paidOut ? "var(--kk-green)" : "var(--kk-gold)" }}>
                      {e.paidOut ? "Reversé ✓" : "En attente"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
