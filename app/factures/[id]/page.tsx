import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { LEGAL_ENTITY } from "@/lib/legalEntity";
import { formatInvoiceNumber } from "@/lib/payments";
import { getPlatformSettings } from "@/lib/platformSettings";

export const metadata = { title: "Facture — K-Kouma" };

const PROVIDER_LABELS: Record<string, string> = {
  paydunya: "PayDunya",
  orange_money_manual: "Orange Money",
};

const THERAPY_LABELS: Record<string, string> = {
  individuelle: "Thérapie individuelle",
  couple: "Thérapie de couple",
  enfant: "Adolescent / Enfant",
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId)) notFound();

  // notFound plutôt qu'un refus : on ne confirme pas qu'un paiement existe.
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, patientId: Number(session.user.id), status: "completed", invoiceNumber: { not: null } },
    include: { patient: { select: { email: true, patientProfile: { select: { nickname: true } } } } },
  });
  if (!payment || payment.invoiceNumber === null) notFound();

  const settings = await getPlatformSettings();
  const paidAt = payment.paidAt ?? payment.createdAt;
  const amount = `${Number(payment.amount).toLocaleString("fr-FR")} ${payment.currency}`;
  const designation = `${THERAPY_LABELS[payment.therapyType] ?? "Séance"}, ${
    payment.sessionsCount === 1 ? "1 séance" : `pack de ${payment.sessionsCount} séances`
  }`;
  const details: [string, string][] = [
    ["Date", paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })],
    ["Paiement", PROVIDER_LABELS[payment.provider] ?? payment.provider],
  ];
  if (payment.providerRef) details.push(["Référence", payment.providerRef]);

  return (
    <div className="min-h-screen print:min-h-0" style={{ background: "var(--kk-bg)" }}>
      <div className="print:hidden">
        <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />
      </div>

      <main className="max-w-2xl mx-auto px-5 py-8 print:py-0">
        <div className="flex items-center justify-between gap-3 mb-5 print:hidden">
          <Link href="/subscription" className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--kk-muted)" }}>
            ← Abonnement
          </Link>
          <PrintButton className="kk-btn-outline whitespace-nowrap">Imprimer / PDF</PrintButton>
        </div>

        <div className="kk-card p-6 sm:p-8 print:shadow-none">
          <div className="flex items-start justify-between gap-4 mb-6">
            <Logo size={28} />
            <div className="text-right">
              <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                Facture
              </h1>
              <p className="text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
                {formatInvoiceNumber(payment.invoiceNumber, paidAt)}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 text-sm mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--kk-muted)" }}>
                Émise par
              </p>
              <p className="font-semibold" style={{ color: "var(--kk-dark)" }}>
                {LEGAL_ENTITY.name}
              </p>
              <div className="text-xs mt-0.5 space-y-0.5" style={{ color: "var(--kk-mid)" }}>
                <p>{LEGAL_ENTITY.address}</p>
                <p className="[overflow-wrap:anywhere]">RCCM : {LEGAL_ENTITY.rccm}</p>
                <p className="[overflow-wrap:anywhere]">NIF : {LEGAL_ENTITY.nif}</p>
                <p>{LEGAL_ENTITY.phone}</p>
                <p>{LEGAL_ENTITY.email}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--kk-muted)" }}>
                Client
              </p>
              <p className="font-semibold" style={{ color: "var(--kk-dark)" }}>
                {payment.patient.patientProfile?.nickname ?? payment.patient.email}
              </p>
              <p className="text-xs mt-0.5 [overflow-wrap:anywhere]" style={{ color: "var(--kk-mid)" }}>
                {payment.patient.email}
              </p>
            </div>
          </div>

          <dl className="space-y-1.5 text-sm mb-6">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt style={{ color: "var(--kk-muted)" }}>{label}</dt>
                <dd className="font-semibold text-right min-w-0 [overflow-wrap:anywhere]" style={{ color: "var(--kk-dark)" }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--kk-border)", color: "var(--kk-muted)" }}>
                <th scope="col" className="text-left font-semibold pb-2">
                  Désignation
                </th>
                <th scope="col" className="text-right font-semibold pb-2 pl-3">
                  Qté
                </th>
                <th scope="col" className="text-right font-semibold pb-2 pl-3">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--kk-dark)" }}>
              <tr>
                <td className="py-3">{designation}</td>
                <td className="py-3 pl-3 text-right">1</td>
                <td className="py-3 pl-3 text-right whitespace-nowrap">{amount}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between gap-4 pt-4" style={{ borderTop: "1px solid var(--kk-border)" }}>
            <span className="font-bold" style={{ color: "var(--kk-dark)" }}>
              Total payé
            </span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-green)" }}>
              {amount}
            </span>
          </div>

          {settings?.invoiceTaxNote && (
            <p className="text-xs mt-6" style={{ color: "var(--kk-muted)" }}>
              {settings.invoiceTaxNote}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
