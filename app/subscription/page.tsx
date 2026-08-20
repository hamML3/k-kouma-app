import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";

export const metadata = { title: "Mon abonnement — K-Kouma" };

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 0,
    label: "Gratuit",
    sessions: "3 séances / mois",
    minutes: 180,
    features: ["3 séances vidéo ou audio", "Accès au chat texte", "Changement de thérapeute à tout moment"],
    color: "var(--kk-green)",
    bg: "var(--kk-green-light)",
    border: "#C2D9BC",
    recommended: false,
  },
  {
    key: "standard",
    name: "Standard",
    price: 25000,
    label: "25 000 XOF / mois",
    sessions: "8 séances / mois",
    minutes: 480,
    features: ["8 séances vidéo ou audio", "Accès au chat texte illimité", "Priorité dans les créneaux", "Support prioritaire"],
    color: "var(--kk-purple)",
    bg: "var(--kk-purple-light)",
    border: "#C8BCEB",
    recommended: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: 50000,
    label: "50 000 XOF / mois",
    sessions: "Séances illimitées",
    minutes: 9999,
    features: ["Séances illimitées", "Accès prioritaire à tous les thérapeutes", "Chat texte illimité", "Suivi personnalisé mensuel"],
    color: "var(--kk-gold)",
    bg: "var(--kk-gold-light)",
    border: "#E9C98A",
    recommended: false,
  },
];

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "patient") redirect("/dashboard");

  const userId = Number(session.user.id);

  const subscription = await prisma.patientSubscription.findUnique({
    where: { patientId: userId },
    include: { plan: { select: { name: true, videoMinutesIncluded: true } } },
  });

  const isActive = subscription?.status === "active";
  const minutesUsed = isActive
    ? (subscription.plan.videoMinutesIncluded - subscription.videoMinutesRemaining)
    : 0;
  const minutesTotal = subscription?.plan.videoMinutesIncluded ?? 0;
  const pct = minutesTotal > 0 ? Math.min(100, Math.round((minutesUsed / minutesTotal) * 100)) : 0;

  const periodEnd = subscription?.currentPeriodEnd;
  const daysLeft = periodEnd
    ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="patient" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Mon abonnement
        </h1>
        {/* Current plan status */}
        {isActive && subscription && (
          <div
            className="rounded-2xl p-5 mb-8"
            style={{ background: "#fff", border: "2px solid var(--kk-green)", boxShadow: "0 6px 24px rgba(85,123,83,0.10)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green)" }}>
                  Plan actuel
                </p>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                  {subscription.plan.name}
                </p>
              </div>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
              >
                Actif
              </span>
            </div>

            {/* Minutes usage bar */}
            {minutesTotal < 9999 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: "var(--kk-muted)" }}>
                  <span>Minutes utilisées</span>
                  <span>{minutesUsed} / {minutesTotal} min</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--kk-border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct > 80 ? "var(--kk-gold)" : "var(--kk-green)" }}
                  />
                </div>
              </div>
            )}

            {daysLeft !== null && (
              <p className="text-xs" style={{ color: "var(--kk-muted)" }}>
                Renouvellement dans{" "}
                <span className="font-bold" style={{ color: "var(--kk-dark)" }}>
                  {daysLeft} jour{daysLeft !== 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Plans */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Choisir un plan
          </h1>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
            Paiement par Mobile Money (Orange Money, Wave) · Bientôt disponible
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-2xl p-5 relative"
              style={{
                background: "#fff",
                border: `1.5px solid ${plan.border}`,
                boxShadow: plan.recommended ? "0 8px 30px rgba(142,124,184,0.12)" : "0 4px 16px rgba(60,70,55,0.05)",
              }}
            >
              {plan.recommended && (
                <div
                  className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: "var(--kk-purple)", color: "#fff" }}
                >
                  Le plus populaire
                </div>
              )}

              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-base" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                    {plan.name}
                  </p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: plan.color }}>
                    {plan.label}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
                  style={{ background: plan.bg, color: plan.color }}
                >
                  {plan.sessions}
                </span>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--kk-mid)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <path d="M2.5 7l3 3L11.5 4" stroke={plan.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled
                className="w-full py-2.5 rounded-xl text-sm font-bold cursor-not-allowed"
                style={{ background: plan.bg, color: plan.color, opacity: 0.7 }}
              >
                {plan.price === 0 ? "Plan actuel" : "Payer par Mobile Money — Bientôt disponible"}
              </button>
            </div>
          ))}
        </div>

        {/* Info block */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--kk-border)", border: "1px solid var(--kk-border-mid)" }}
        >
          <p className="text-sm font-bold mb-2" style={{ color: "var(--kk-dark)" }}>
            Paiement par Mobile Money
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--kk-muted)" }}>
            Le paiement par Orange Money, Wave et autres opérateurs Mobile Money sera disponible très prochainement.
            Votre première séance avec votre psychologue est offerte sans engagement.
          </p>
        </div>
      </main>
    </div>
  );
}
