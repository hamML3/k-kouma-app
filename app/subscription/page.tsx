import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BuyButton, ManualPaymentForm } from "./_client";
import { SESSION_PRICING, resolveTherapyType } from "@/lib/pricing";
import { isPaydunyaConfigured } from "@/lib/paydunya";
import { orangeMoneyMerchantCode, isOrangeMoneyManualEnabled } from "@/lib/orangeMoney";

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
  const therapyType = resolveTherapyType(answers);
  const pricing = SESSION_PRICING[therapyType];
  const credits = profile?.sessionCredits ?? 0;
  const paymentAvailable = isPaydunyaConfigured();
  const merchantCode = orangeMoneyMerchantCode();
  const manualOrangeMoneyEnabled = await isOrangeMoneyManualEnabled();

  const PAYMENT_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "En attente", bg: "var(--kk-gold-light)", color: "var(--kk-gold-text)" },
    completed: { label: "Payé", bg: "var(--kk-green-light)", color: "var(--kk-green-text)" },
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
          <div className="rounded-2xl p-4 mb-6 text-sm" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}>
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
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green-text)" }}>
              Séances disponibles
            </p>
            <p className="font-bold text-3xl" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              {credits}
            </p>
          </div>
          <p className="text-xs text-right max-w-[45%]" style={{ color: "var(--kk-muted)" }}>
            {therapyType === "coaching" ? pricing.label : `Thérapie ${pricing.label.toLowerCase()}`} · 1 séance = 1 rendez-vous, quel que soit le format (chat, audio, vidéo)
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
            {paymentAvailable
              ? "Paiement par Mobile Money (Orange Money, Wave) via PayDunya."
              : manualOrangeMoneyEnabled
              ? "Paiement par Orange Money, vérifié manuellement par notre équipe."
              : "Paiement en ligne temporairement indisponible."}
          </p>
        </div>

        {!paymentAvailable && !manualOrangeMoneyEnabled && (
          <div
            className="rounded-2xl p-4 mb-6 text-sm flex items-start gap-3"
            style={{ background: "var(--kk-gold-light)", color: "#8A6530", border: "1px solid #E9C98A" }}
          >
            <span className="text-lg shrink-0">⏸️</span>
            <div>
              <p className="font-bold mb-0.5" style={{ color: "var(--kk-gold-text)" }}>
                Paiement en ligne temporairement indisponible
              </p>
              <p>
                Nous changeons de prestataire de paiement. En attendant,{" "}
                <Link href="/contact" className="underline font-semibold">contactez-nous</Link> pour acheter des
                séances par un autre moyen.
              </p>
            </div>
          </div>
        )}

        {!paymentAvailable && manualOrangeMoneyEnabled && merchantCode && (
          <div className="mb-8 space-y-4">
            <div
              className="rounded-2xl p-4 text-sm"
              style={{ background: "var(--kk-purple-light)", color: "var(--kk-dark)", border: "1px solid #C8BCEB" }}
            >
              <p className="font-bold mb-2">Paiement par Orange Money</p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: "var(--kk-mid)" }}>
                <li>
                  Dans l&apos;appli Orange Money, utilisez <strong>« Payer marchand »</strong> (ou le menu USSD
                  Orange Money équivalent) avec le code marchand{" "}
                  <strong style={{ color: "var(--kk-dark)" }}>{merchantCode}</strong> et le montant exact.
                </li>
                <li>Notez la référence de transaction reçue par SMS.</li>
                <li>Déclarez votre paiement ci-dessous — vos séances sont créditées après vérification.</li>
              </ol>
            </div>
            <ManualPaymentForm
              singleAmount={`${pricing.single.toLocaleString("fr-FR")} FCFA`}
              pack3Amount={`${pricing.pack3.toLocaleString("fr-FR")} FCFA`}
            />
          </div>
        )}

        {paymentAvailable && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]" style={{ background: "#fff", border: "1.5px solid var(--kk-border)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
                À l&apos;unité
              </p>
              <p className="font-bold text-2xl mb-4" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {pricing.single.toLocaleString("fr-FR")} FCFA
              </p>
              <BuyButton pack="single" label="Acheter 1 séance" className="kk-btn-outline w-full text-sm" />
            </div>

            <div
              className="rounded-2xl p-5 relative transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
              style={{ background: "#fff", border: "2px solid var(--kk-purple)", boxShadow: "0 8px 30px rgba(142,124,184,0.12)" }}
            >
              {pricing.pack3Was && (
                <div
                  className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: "var(--kk-purple)", color: "#fff" }}
                >
                  Offre
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
                Pack 3 séances
              </p>
              <p className="font-bold text-2xl mb-4 flex items-baseline gap-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {pricing.pack3Was && (
                  <s className="text-base font-semibold" style={{ color: "var(--kk-faint)" }}>
                    {pricing.pack3Was.toLocaleString("fr-FR")}
                  </s>
                )}
                {pricing.pack3.toLocaleString("fr-FR")} FCFA
              </p>
              <BuyButton pack="pack3" label="Acheter le pack de 3" className="kk-btn-purple w-full text-sm" />
            </div>
          </div>
        )}

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
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                      {p.invoiceNumber !== null && (
                        <Link href={`/factures/${p.id}`} className="text-xs font-semibold" style={{ color: "var(--kk-green-text)" }}>
                          Voir la facture
                        </Link>
                      )}
                    </div>
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
