import { NextRequest, NextResponse } from "next/server";
import { isValidUnsubscribe, unsubscribe } from "@/lib/campaigns";

/**
 * Désinscription « en un clic » (RFC 8058) : Gmail, Outlook… envoient un POST
 * à l'adresse de l'en-tête List-Unsubscribe. Un GET (clic direct) mène à la
 * page de confirmation.
 */
export async function POST(req: NextRequest) {
  const u = Number(req.nextUrl.searchParams.get("u"));
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!isValidUnsubscribe(u, t)) return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  await unsubscribe(u);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const url = new URL("/desabonnement", req.nextUrl);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url);
}
