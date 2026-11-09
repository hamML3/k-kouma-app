import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { LEGAL_ENTITY } from "@/lib/legalEntity";
import { loadInvoice } from "@/lib/invoices";
import { emailMyInvoiceAction } from "@/lib/actions/invoices";

export const metadata = { title: "Facture — K-Kouma" };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId)) notFound();

  // notFound plutôt qu'un refus : on ne confirme pas qu'un paiement existe.
  const invoice = await loadInvoice(paymentId, Number(session.user.id));
  if (!invoice) notFound();

  const { email: sent } = await searchParams;
  const details: [string, string][] = [
    ["Date", invoice.date],
    ["Paiement", invoice.provider],
  ];
  if (invoice.reference) details.push(["Référence", invoice.reference]);

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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <form action={emailMyInvoiceAction}>
              <input type="hidden" name="paymentId" value={invoice.paymentId} />
              <button type="submit" className="kk-btn-outline whitespace-nowrap">
                Recevoir par e-mail
              </button>
            </form>
            <PrintButton className="kk-btn-outline whitespace-nowrap">Imprimer / PDF</PrintButton>
          </div>
        </div>
        {sent === "sent" && (
          <div className="rounded-2xl p-4 mb-5 text-sm font-semibold print:hidden" style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}>
            Facture envoyée à {invoice.clientEmail}.
          </div>
        )}
        {sent === "failed" && (
          <div className="kk-error mb-5 print:hidden">
            L&apos;envoi n&apos;a pas abouti. Réessayez plus tard, ou imprimez la facture.
          </div>
        )}
        {sent === "limit" && (
          <div className="kk-error mb-5 print:hidden">
            Vous avez demandé plusieurs envois récemment. Réessayez dans un moment.
          </div>
        )}

        <div className="kk-card p-6 sm:p-8 print:shadow-none">
          <div className="flex items-start justify-between gap-4 mb-6">
            <Logo size={28} />
            <div className="text-right">
              <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                Facture
              </h1>
              <p className="text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
                {invoice.number}
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
                {invoice.clientName}
              </p>
              <p className="text-xs mt-0.5 [overflow-wrap:anywhere]" style={{ color: "var(--kk-mid)" }}>
                {invoice.clientEmail}
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
                <td className="py-3">{invoice.designation}</td>
                <td className="py-3 pl-3 text-right">1</td>
                <td className="py-3 pl-3 text-right whitespace-nowrap">{invoice.amount}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between gap-4 pt-4" style={{ borderTop: "1px solid var(--kk-border)" }}>
            <span className="font-bold" style={{ color: "var(--kk-dark)" }}>
              Total payé
            </span>
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-green-text)" }}>
              {invoice.amount}
            </span>
          </div>

          {invoice.taxNote && (
            <p className="text-xs mt-6" style={{ color: "var(--kk-muted)" }}>
              {invoice.taxNote}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
