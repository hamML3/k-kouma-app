import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Reçu de paiement — K-Kouma" };

const PROVIDER_LABELS: Record<string, string> = {
  paydunya: "PayDunya",
  orange_money_manual: "Orange Money",
};

const THERAPY_LABELS: Record<string, string> = {
  individuelle: "Thérapie individuelle",
  couple: "Thérapie de couple",
  enfant: "Adolescent / Enfant",
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId)) notFound();

  // notFound plutôt qu'un refus : on ne confirme pas qu'un paiement existe.
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, patientId: Number(session.user.id), status: "completed" },
    include: { patient: { select: { email: true, patientProfile: { select: { nickname: true } } } } },
  });
  if (!payment) notFound();

  const paidAt = payment.paidAt ?? payment.createdAt;
  const number = `KK-${paidAt.getFullYear()}-${String(payment.id).padStart(6, "0")}`;
  const rows: [string, string][] = [
    ["Reçu n°", number],
    ["Date", paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })],
    ["Patient", payment.patient.patientProfile?.nickname ?? payment.patient.email],
    ["Email", payment.patient.email],
    ["Prestation", `${THERAPY_LABELS[payment.therapyType] ?? "Séance"}, ${payment.sessionsCount === 1 ? "1 séance" : `pack de ${payment.sessionsCount} séances`}`],
    ["Moyen de paiement", PROVIDER_LABELS[payment.provider] ?? payment.provider],
  ];
  if (payment.providerRef) rows.push(["Référence", payment.providerRef]);

  return (
    <div className="min-h-screen print:min-h-0" style={{ background: "var(--kk-bg)" }}>
      <div className="print:hidden">
        <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      </div>

      <main className="max-w-xl mx-auto px-5 py-8 print:py-0">
        <div className="flex items-center justify-between gap-3 mb-5 print:hidden">
          <Link href="/subscription" className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--kk-muted)" }}>
            ← Abonnement
          </Link>
          <PrintButton className="kk-btn-outline whitespace-nowrap">Imprimer / PDF</PrintButton>
        </div>

        <div className="kk-card p-6 sm:p-8 print:shadow-none">
          <div className="flex items-start justify-between gap-4 mb-6">
            <Logo size={28} />
            <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Reçu de paiement
            </h1>
          </div>

          <dl className="space-y-2.5 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt style={{ color: "var(--kk-muted)" }}>{label}</dt>
                <dd className="font-semibold text-right min-w-0 [overflow-wrap:anywhere]" style={{ color: "var(--kk-dark)" }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between gap-4 mt-6 pt-5" style={{ borderTop: "1px solid var(--kk-border)" }}>
            <span className="font-bold" style={{ color: "var(--kk-dark)" }}>
              Montant payé
            </span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-green)" }}>
              {Number(payment.amount).toLocaleString("fr-FR")} {payment.currency}
            </span>
          </div>

          <p className="text-xs mt-6" style={{ color: "var(--kk-muted)" }}>
            Ce reçu atteste du paiement reçu par K-Kouma. Il ne constitue pas une facture.
          </p>
        </div>
      </main>
    </div>
  );
}
