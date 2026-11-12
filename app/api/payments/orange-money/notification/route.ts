import { NextRequest, NextResponse } from "next/server";
import { handleOrangeMoneyNotification } from "@/lib/orangeMoneyPayments";

// POST /api/payments/orange-money/notification
// Envoyée par Orange quand un paiement se termine (SUCCESS ou FAILED). Seule
// une notification portant le notif_token de l'un de nos paiements est prise
// en compte (lib/orangeMoneyPayments.ts).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    body = contentType.includes("application/json")
      ? ((await req.json()) as Record<string, unknown>)
      : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });

  try {
    const outcome = await handleOrangeMoneyNotification(body);
    if (outcome === "not_found") return NextResponse.json({ error: "Paiement inconnu" }, { status: 404 });
    return NextResponse.json({ ok: true, status: outcome });
  } catch (err) {
    console.error("[orange_money] notification non traitée:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erreur temporaire" }, { status: 500 });
  }
}
