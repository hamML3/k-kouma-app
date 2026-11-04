import { prisma } from "@/lib/prisma";
import { BarChart } from "@/components/charts/BarChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { lastMonths, bucketByMonth } from "@/lib/chartHelpers";

export const metadata = { title: "Statistiques — Administration K-Kouma" };

export default async function AdminStatsPage() {
  const [patientProfiles, appointments, completedPaymentPatients, verifiedTherapists, completedByTherapist] =
    await Promise.all([
      prisma.patientProfile.findMany({
        select: { userId: true, onboardingAnswers: true, user: { select: { createdAt: true } } },
      }),
      prisma.appointment.findMany({ select: { scheduledAt: true, status: true } }),
      prisma.payment.findMany({
        where: { status: "completed" },
        select: { patientId: true },
        distinct: ["patientId"],
      }),
      prisma.therapistProfile.findMany({
        where: { isVerified: true },
        select: { userId: true, firstName: true, lastName: true },
      }),
      prisma.appointment.groupBy({
        by: ["therapistId"],
        where: { status: "completed" },
        _count: { _all: true },
      }),
    ]);

  const months = lastMonths(6);

  // --- Inscriptions patients, par mois ---
  const signupTrend = bucketByMonth(patientProfiles, (p) => p.user.createdAt, () => 1, months);

  // --- Entonnoir onboarding → premier paiement ---
  const totalPatients = patientProfiles.length;
  const onboarded = patientProfiles.filter((p) => p.onboardingAnswers !== null);
  const paidPatientIds = new Set(completedPaymentPatients.map((p) => p.patientId));
  const onboardedAndPaid = onboarded.filter((p) => paidPatientIds.has(p.userId)).length;
  const conversionRate = onboarded.length > 0 ? Math.round((onboardedAndPaid / onboarded.length) * 100) : 0;

  const funnel = [
    { label: "Patients inscrits", value: totalPatients },
    { label: "Onboarding terminé", value: onboarded.length },
    { label: "Ont payé depuis", value: onboardedAndPaid },
  ];

  // --- Volume de rendez-vous par mois, par statut ---
  const completedAppointments = appointments.filter((a) => a.status === "completed");
  const upcomingAppointments = appointments.filter((a) => a.status === "pending" || a.status === "confirmed");
  const canceledAppointments = appointments.filter((a) => a.status === "canceled");
  const countPerMonth = (list: typeof appointments) =>
    bucketByMonth(list, (a) => a.scheduledAt, () => 1, months);

  const completedTrend = countPerMonth(completedAppointments);
  const upcomingTrend = countPerMonth(upcomingAppointments);
  const canceledTrend = countPerMonth(canceledAppointments);

  // --- Classement des psychologues par nombre de séances effectuées ---
  // (distinct de "Gains par psychologue" dans Finances, qui classe par montant)
  const countByTherapistId = new Map(completedByTherapist.map((g) => [g.therapistId, g._count._all]));
  const leaderboard = verifiedTherapists
    .map((t) => ({
      label: `${t.firstName} ${t.lastName}`,
      value: countByTherapistId.get(t.userId) ?? 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Statistiques
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Croissance, conversion et activité — au-delà des chiffres financiers du tableau Finances
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Signup trend */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kk-dark)" }}>
            Nouvelles inscriptions patients — 6 derniers mois
          </h2>
          <BarChart
            categories={months.map((m) => m.label)}
            series={[{ key: "signups", label: "Patients inscrits", color: "#2F8F5B", values: signupTrend }]}
            ariaLabel="Nombre de nouvelles inscriptions de patients par mois sur les 6 derniers mois"
          />
        </div>

        {/* Onboarding -> payment funnel */}
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
              Onboarding → premier paiement
            </h2>
            <div className="text-right">
              <p className="font-bold text-2xl" style={{ color: "var(--kk-green-text)", fontFamily: "var(--font-lora)" }}>
                {conversionRate}%
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--kk-muted)" }}>
                des onboardings terminés ont payé
              </p>
            </div>
          </div>
          <HorizontalBarChart
            items={funnel}
            color="#2F8F5B"
            ariaLabel="Entonnoir : patients inscrits, ayant terminé l'onboarding, puis ayant payé"
          />
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-8" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--kk-dark)" }}>
          Rendez-vous par mois et par statut — 6 derniers mois
        </h2>
        <BarChart
          categories={months.map((m) => m.label)}
          series={[
            { key: "completed", label: "Effectués", color: "#2F8F5B", values: completedTrend },
            { key: "upcoming", label: "À venir (en attente/confirmés)", color: "#7A5FB0", values: upcomingTrend },
            { key: "canceled", label: "Annulés", color: "#C0392B", values: canceledTrend },
          ]}
          ariaLabel="Nombre de rendez-vous par mois, répartis par statut, sur les 6 derniers mois"
        />
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: "var(--kk-dark)" }}>
          Classement des psychologues par séances effectuées
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--kk-muted)" }}>
          Volume d&apos;activité — à distinguer du classement par gains dans Finances
        </p>
        {leaderboard.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucune séance effectuée pour l&apos;instant.</p>
        ) : (
          <HorizontalBarChart
            items={leaderboard}
            color="#7A5FB0"
            ariaLabel="Classement des psychologues par nombre de séances effectuées"
          />
        )}
      </div>
    </>
  );
}
