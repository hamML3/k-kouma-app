import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponseInit, CSV_BOM } from "@/lib/csv";
import type { Prisma } from "@prisma/client";

// Le middleware (proxy.ts) laisse passer les requêtes authentifiées sans
// vérifier le rôle — cette route doit donc faire le contrôle elle-même,
// comme requireAdmin() dans lib/actions/admin.ts (non exportée, donc
// dupliquée ici pour un route handler).
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  therapist: "Psychologue",
  patient: "Patient",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  archived: "Archivé",
};

/** Export CSV des comptes utilisateurs — réservé aux admins, respecte les filtres `role`/`q` de /admin/users. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    return NextResponse.json({ error: "Accès refusé : réservé aux administrateurs." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const where: Prisma.UserWhereInput = {
    ...(roleFilter ? { role: roleFilter as "admin" | "therapist" | "patient" } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { patientProfile: { nickname: { contains: q } } },
            { therapistProfile: { firstName: { contains: q } } },
            { therapistProfile: { lastName: { contains: q } } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      patientProfile: { select: { nickname: true } },
      therapistProfile: { select: { firstName: true, lastName: true } },
    },
  });

  const rows = users.map((u) => [
    u.id,
    u.email,
    ROLE_LABELS[u.role] ?? u.role,
    STATUS_LABELS[u.status] ?? u.status,
    u.patientProfile?.nickname ??
      (u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : ""),
    u.createdAt.toISOString(),
  ]);

  const csv = toCsv(["ID", "Email", "Rôle", "Statut", "Nom", "Inscrit le"], rows);

  await logAudit({
    actor: { id: Number(session.user.id), email: session.user.email },
    action: "admin.export.users",
    metadata: { count: users.length, role: roleFilter ?? null, q: q ?? null },
  });

  const filename = `k-kouma-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(CSV_BOM + csv, csvResponseInit(filename));
}
