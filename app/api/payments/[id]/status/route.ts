import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORANGE_MONEY_PROVIDER, syncOrangeMoneyPayment } from "@/lib/orangeMoneyPayments";

export const dynamic = "force-dynamic";

// GET /api/payments/<id>/status : état d'un paiement du patient connecté, suivi
// en direct par la page Mes séances au retour de la page Orange Money. Un
// paiement Orange Money encore en attente est revérifié auprès d'Orange.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "patient") return Response.json({ error: "Non authentifié" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Paiement inconnu" }, { status: 404 });

  const where = { id, patientId: Number(session.user.id) };
  const payment = await prisma.payment.findFirst({ where, select: { status: true, provider: true } });
  if (!payment) return Response.json({ error: "Paiement inconnu" }, { status: 404 });

  if (payment.status === "pending" && payment.provider === ORANGE_MONEY_PROVIDER) {
    try {
      await syncOrangeMoneyPayment(id);
    } catch {
      // Orange injoignable : on renvoie l'état connu, la page redemandera.
    }
  }
  const now = await prisma.payment.findFirst({ where, select: { status: true, sessionsCount: true } });
  return Response.json({ status: now?.status ?? payment.status, sessionsCount: now?.sessionsCount ?? null });
}
