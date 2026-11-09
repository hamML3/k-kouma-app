import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatInvoiceNumber } from "@/lib/payments";
import { getPlatformSettings } from "@/lib/platformSettings";
import { sendInvoiceEmail } from "@/lib/email";

const PROVIDER_LABELS: Record<string, string> = {
  paydunya: "PayDunya",
  orange_money_manual: "Orange Money",
};

const THERAPY_LABELS: Record<string, string> = {
  individuelle: "Thérapie individuelle",
  couple: "Thérapie de couple",
  enfant: "Adolescent / Enfant",
  coaching: "Coaching de vie",
};

/** Ce qu'affiche une facture, à l'écran comme dans l'e-mail : une seule source. */
export type InvoiceView = {
  paymentId: number;
  number: string;
  date: string;
  provider: string;
  reference: string | null;
  designation: string;
  amount: string;
  clientName: string;
  clientEmail: string;
  taxNote: string | null;
};

type InvoicePayment = {
  id: number;
  invoiceNumber: number;
  paidAt: Date | null;
  createdAt: Date;
  provider: string;
  providerRef: string | null;
  therapyType: string;
  sessionsCount: number;
  amount: { toString(): string } | number;
  currency: string;
  patient: { email: string; patientProfile: { nickname: string | null } | null };
};

export function invoiceView(payment: InvoicePayment, taxNote: string | null): InvoiceView {
  const paidAt = payment.paidAt ?? payment.createdAt;
  return {
    paymentId: payment.id,
    number: formatInvoiceNumber(payment.invoiceNumber, paidAt),
    date: paidAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Bamako" }),
    provider: PROVIDER_LABELS[payment.provider] ?? payment.provider,
    reference: payment.providerRef,
    designation: `${THERAPY_LABELS[payment.therapyType] ?? "Séance"}, ${
      payment.sessionsCount === 1 ? "1 séance" : `pack de ${payment.sessionsCount} séances`
    }`,
    amount: `${Number(payment.amount).toLocaleString("fr-FR")} ${payment.currency}`,
    clientName: payment.patient.patientProfile?.nickname ?? payment.patient.email,
    clientEmail: payment.patient.email,
    taxNote: taxNote?.trim() || null,
  };
}

/** Facture d'un paiement encaissé ; `patientId` restreint à celles du patient connecté. */
export async function loadInvoice(paymentId: number, patientId?: number): Promise<InvoiceView | null> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, status: "completed", invoiceNumber: { not: null }, ...(patientId ? { patientId } : {}) },
    include: { patient: { select: { email: true, patientProfile: { select: { nickname: true } } } } },
  });
  if (!payment || payment.invoiceNumber === null) return null;
  const settings = await getPlatformSettings();
  return invoiceView({ ...payment, invoiceNumber: payment.invoiceNumber }, settings?.invoiceTaxNote ?? null);
}

/**
 * Envoie la facture par e-mail à l'adresse du compte patient. Best-effort :
 * renvoie false (sans lever) si l'envoi échoue ou si l'e-mail n'est pas
 * configuré ; la facture reste consultable dans l'espace du patient.
 */
export async function emailInvoice(paymentId: number, patientId?: number): Promise<boolean> {
  try {
    const invoice = await loadInvoice(paymentId, patientId);
    if (!invoice) return false;
    const { error } = await sendInvoiceEmail(invoice.clientEmail, invoice);
    if (error) {
      console.error(`[factures] envoi refusé pour le paiement ${paymentId}:`, error.name);
      return false;
    }
    await prisma.payment.update({ where: { id: paymentId }, data: { invoiceEmailedAt: new Date() } });
    return true;
  } catch (err) {
    console.error(`[factures] envoi échoué pour le paiement ${paymentId}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Envoi après la réponse : la validation d'un paiement n'attend jamais le service d'e-mail. */
export function scheduleInvoiceEmail(paymentId: number): void {
  try {
    after(() => emailInvoice(paymentId));
  } catch {
    void emailInvoice(paymentId);
  }
}
