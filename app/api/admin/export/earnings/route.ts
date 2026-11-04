import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponseInit, CSV_BOM } from "@/lib/csv";

/** Export CSV des gains psychologues (reversements) — réservé aux admins. */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    return NextResponse.json({ error: "Accès refusé : réservé aux administrateurs." }, { status: 403 });
  }

  const earnings = await prisma.therapistEarning.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      therapist: { select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
    },
  });

  const rows = earnings.map((e) => [
    e.id,
    e.therapist.therapistProfile
      ? `${e.therapist.therapistProfile.firstName} ${e.therapist.therapistProfile.lastName}`
      : "",
    e.therapist.email,
    Number(e.amount),
    e.currency,
    e.paidOut ? "Oui" : "Non",
    e.paidOutAt ? e.paidOutAt.toISOString() : "",
    e.createdAt.toISOString(),
  ]);

  const csv = toCsv(
    ["ID", "Psychologue", "Email psychologue", "Montant", "Devise", "Reversé", "Reversé le", "Créé le"],
    rows
  );

  await logAudit({
    actor: { id: Number(session.user.id), email: session.user.email },
    action: "admin.export.earnings",
    metadata: { count: earnings.length },
  });

  const filename = `k-kouma-gains-psychologues-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(CSV_BOM + csv, csvResponseInit(filename));
}
