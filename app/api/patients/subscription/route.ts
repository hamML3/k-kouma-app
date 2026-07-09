import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSubscriptionSchema } from "@/lib/validators/subscription";

// GET : récupérer l'abonnement actuel du patient
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const subscription = await prisma.patientSubscription.findUnique({
    where: { patientId: Number(session.user.id) },
    include: { plan: true },
  });

  return NextResponse.json({ subscription });
}

// POST : créer ou renouveler un abonnement après paiement Orange Money
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "patient") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { planId, omTransactionRef } = parsed.data;

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, isActive: true },
  });
  if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.patientSubscription.upsert({
    where: { patientId: Number(session.user.id) },
    update: {
      planId,
      status: "active",
      lastOmTransactionRef: omTransactionRef,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      videoMinutesRemaining: plan.videoMinutesIncluded,
    },
    create: {
      patientId: Number(session.user.id),
      planId,
      status: "active",
      lastOmTransactionRef: omTransactionRef,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      videoMinutesRemaining: plan.videoMinutesIncluded,
    },
    include: { plan: true },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
