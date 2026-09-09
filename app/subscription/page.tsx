import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BuyButton } from "./_client";
import { SESSION_PRICING, type TherapyType } from "@/lib/pricing";

export const metadata = { title: "Mes séances — K-Kouma" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; canceled?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "patient") redirect("/dashboard");

  const params = await searchParams;
  const userId = Number(session.user.id);

  const [profile, payments, sessionsUsed] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { userId },
      select: { sessionCredits: true, onboardingAnswers: true },
    }),
    prisma.payment.findMany({
      where: { patientId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.appointment.count({
      where: { patientId: userId, status: { not: "canceled" } },
    }),
  ]);

  const totalSpent = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const answers = profile?.onboardingAnswers as { therapyType?: string } | null;
  const therapyType: TherapyType =
    answers?.therapyType === "couple" || answers?.therapyType === "enfant"
      ? answers.therapyType
      : "individuelle";
  const pricing = SESSION_PRICING[therapyType];
  const credits = profile?.sessionCredits ?? 0;

  const PAYMENT_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "En attente", bg: "var(--kk-gold-light)", color: "var(--kk-gold)" },
    completed: { label: "Payé", bg: "var(--kk-green-light)", color: "var(--kk-green)" },
    failed: { label: "Échoué", bg: "#FFF1F0", color: "#C0392B" },
    canceled: { label: "Annulé", bg: "var(--kk-border)", color: "var(--kk-muted)" },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="patient" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Mes séances
        </h1>

        {params.paid === "1" && (
          <div className="rounded-2xl p-4 mb-6 text-sm" style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}>
            Paiement en cours de confirmation — vos séances seront créditées dans quelques instants.
          </div>
        )}
        {params.canceled === "1" && (
          <div className="rounded-2xl p-4 mb-6 text-sm" style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}>
            Paiement annulé — aucune séance n&apos;a été débitée.
          </div>
        )}
        {params.error === "credit" && (
          <div className="rounded-2xl p-4 mb-6 text-sm" style={{ background: "#FFF1F0", color: "#C0392B" }}>
            Vous n&apos;avez plus de séance disponible. Achetez-en ci-dessous pour continuer à réserver.
          </div>
        )}

        {/* Credit balance */}
        <div
          className="rounded-2xl p-5 mb-8 flex items-center justify-between"
          style={{ background: "#fff", border: "2px solid var(--kk-green)", boxShadow: "0 6px 24px rgba(85,123,83,0.10)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green)" }}>
              Séances disponibles
            </p>
            <p className="font-bold text-3xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {credits}
            </p>
          </div>
          <p className="text-xs text-right max-w-[45%]" style={{ color: "var(--kk-muted)" }}>
            Thérapie {pricing.label.toLowerCase()} · 1 séance = 1 rendez-vous, quel que soit le format (chat, audio, vidéo)
          </p>
        </div>

        {/* Spending summary */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-muted)" }}>
              Total dépensé
            </p>
            <p className="font-bold text-2xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {totalSpent.toLocaleString("fr-FR")} <span className="text-base">XOF</span>
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-muted)" }}>
              Séances réservées
            </p>
            <p className="font-bold text-2xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {sessionsUsed}
            </p>
          </div>
        </div>

        {/* Buy */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Acheter des séances
          </h2>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
            Paiement par Mobile Money (Orange Money, Wave) via PayDunya.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
              À l&apos;unité
            </p>
            <p className="font-bold text-2xl mb-4" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {pricing.single.toLocaleString("fr-FR")} FCFA
            </p>
            <BuyButton pack="single" label="Acheter 1 séance" className="kk-btn-outline w-full text-sm" />
          </div>

          <div
            className="rounded-2xl p-5 relative"
            style={{ background: "#fff", border: "2px solid var(--kk-purple)", boxShadow: "0 8px 30px rgba(142,124,184,0.12)" }}
          >
            {pricing.pack4Was && (
              <div
                className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--kk-purple)", color: "#fff" }}
              >
                Offre
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
              Pack 4 séances
            </p>
            <p className="font-bold text-2xl mb-4 flex items-baseline gap-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {pricing.pack4Was && (
                <s className="text-base font-semibold" style={{ color: "var(--kk-faint)" }}>
                  {pricing.pack4Was.toLocaleString("fr-FR")}
                </s>
              )}
              {pricing.pack4.toLocaleString("fr-FR")} FCFA
            </p>
            <BuyButton pack="pack4" label="Acheter le pack de 4" className="kk-btn-purple w-full text-sm" />
          </div>
        </div>

        {/* Payment history */}
        {payments.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              Historique des paiements
            </h2>
            <div className="space-y-2">
              {payments.map((p) => {
                const statusInfo = PAYMENT_STATUS_LABELS[p.status] ?? PAYMENT_STATUS_LABELS.pending;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-4 flex items-center justify-between gap-3"
                    style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                        {p.sessionsCount === 1 ? "1 séance" : `Pack ${p.sessionsCount} séances`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                        {new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {" · "}
                        {Number(p.amount).toLocaleString("fr-FR")} {p.currency}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: statusInfo.bg, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
