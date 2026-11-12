import { NextRequest, NextResponse } from "next/server";
import { syncOrangeMoneyPayment, type SyncOutcome } from "@/lib/orangeMoneyPayments";

// GET /api/payments/orange-money/retour?p=<id>[&annule=1]
// return_url et cancel_url du paiement Orange Money : on demande l'état réel
// à Orange (jamais déduit de l'URL) puis on renvoie le patient sur Mes séances.
// Sans session requise : la vérification ne fait que constater l'état chez
// Orange, et la destination est toujours la même page.
const DESTINATION: Record<SyncOutcome | "error", string> = {
  completed: "/subscription?paid=1",
  pending: "/subscription?om=attente",
  failed: "/subscription?om=echec",
  canceled: "/subscription?canceled=1",
  not_found: "/subscription",
  error: "/subscription?om=attente",
};

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("p"));
  const canceledByPatient = req.nextUrl.searchParams.get("annule") === "1";
  let outcome: SyncOutcome | "error" = "not_found";
  if (Number.isInteger(id) && id > 0) {
    try {
      outcome = await syncOrangeMoneyPayment(id, { canceledByPatient });
    } catch (err) {
      console.error("[orange_money] état au retour indisponible:", err instanceof Error ? err.message : err);
      outcome = "error";
    }
  }
  return NextResponse.redirect(new URL(DESTINATION[outcome], process.env.NEXTAUTH_URL ?? req.nextUrl.origin), 303);
}
