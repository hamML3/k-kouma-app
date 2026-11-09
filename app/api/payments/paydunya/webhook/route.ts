import { completePendingPayment } from "@/lib/payments";
import { scheduleInvoiceEmail } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { confirmInvoice } from "@/lib/paydunya";
import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/paydunya/webhook
// Appelé par PayDunya (IPN) après une tentative de paiement. On ne fait
// jamais confiance au corps de cette requête pour l'état du paiement — on
// revérifie toujours directement auprès de PayDunya via confirmInvoice().
export async function POST(req: NextRequest) {
  let token: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { data?: { token?: string }; token?: string };
      token = body.data?.token ?? body.token;
    } else {
      const form = await req.formData();
      const raw = form.get("data");
      if (typeof raw === "string") {
        token = (JSON.parse(raw) as { token?: string }).token;
      } else {
        token = (form.get("token") as string | null) ?? undefined;
      }
    }
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { providerRef: token } });
  if (!payment) return NextResponse.json({ error: "Paiement inconnu" }, { status: 404 });

  // Déjà traité (livraisons multiples de l'IPN) : on répond OK sans rien refaire.
  if (payment.status === "completed") {
    return NextResponse.json({ ok: true });
  }

  let confirmation;
  try {
    confirmation = await confirmInvoice(token);
  } catch (err) {
    console.error("[paydunya webhook] confirmation échouée:", err);
    return NextResponse.json({ error: "Vérification impossible" }, { status: 502 });
  }

  if (!confirmation.isCompleted) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    return NextResponse.json({ ok: true, status: confirmation.status });
  }

  if (await completePendingPayment(payment)) scheduleInvoiceEmail(payment.id);

  return NextResponse.json({ ok: true });
}
