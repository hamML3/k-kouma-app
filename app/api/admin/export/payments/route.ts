import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponseInit, CSV_BOM } from "@/lib/csv";
import { hasPermission } from "@/lib/permissions";

/** Export CSV des paiements complétés — admin, ou modérateur avec la permission "manage_finances". */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, "manage_finances")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    where: { status: "completed" },
    orderBy: { paidAt: "desc" },
    include: { patient: { select: { email: true, patientProfile: { select: { nickname: true } } } } },
  });

  const rows = payments.map((p) => [
    p.id,
    p.patient.patientProfile?.nickname ?? "",
    p.patient.email,
    Number(p.amount),
    p.currency,
    p.sessionsCount,
    p.provider,
    p.paidAt ? p.paidAt.toISOString() : "",
  ]);

  const csv = toCsv(
    ["ID", "Patient", "Email patient", "Montant", "Devise", "Séances", "Fournisseur", "Payé le"],
    rows
  );

  await logAudit({
    actor: { id: Number(session.user.id), email: session.user.email },
    action: "admin.export.payments",
    metadata: { count: payments.length },
  });

  const filename = `k-kouma-paiements-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(CSV_BOM + csv, csvResponseInit(filename));
}
