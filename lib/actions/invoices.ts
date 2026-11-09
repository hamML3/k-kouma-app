'use server'

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { emailInvoice } from "@/lib/invoices";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Le patient se renvoie une de ses factures par e-mail, à l'adresse de son
 * compte (jamais à une adresse saisie). L'identité vient de la session :
 * emailInvoice ne trouve rien si la facture n'est pas la sienne.
 */
export async function emailMyInvoiceAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "patient") redirect("/login");

  const paymentId = Number(formData.get("paymentId"));
  if (!Number.isInteger(paymentId) || paymentId <= 0) redirect("/subscription");

  const patientId = Number(session.user.id);
  if (!rateLimit(`invoice-email:${patientId}`, 5, 60 * 60 * 1000).allowed) {
    redirect(`/factures/${paymentId}?email=limit`);
  }

  const sent = await emailInvoice(paymentId, patientId);
  redirect(`/factures/${paymentId}?email=${sent ? "sent" : "failed"}`);
}
