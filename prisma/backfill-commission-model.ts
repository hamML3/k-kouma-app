/**
 * K-Kouma — Migration de données vers le modèle de commission
 * Usage : npm run backfill:commission
 *
 * À exécuter UNE FOIS sur chaque serveur, juste après avoir appliqué la
 * migration `20261106000000_commission_model` (prisma migrate deploy).
 *
 * 1. Amorce `Payment.sessionsRemaining` : les crédits déjà payés mais pas
 *    encore consommés (`PatientProfile.sessionCredits > 0`) sont rattachés
 *    au paiement complété le plus récent de chaque patient — on ne peut pas
 *    reconstruire l'ordre exact de consommation FIFO d'avant ce système,
 *    donc c'est une approximation raisonnable, pas un calcul exact.
 * 2. Recalcule tous les gains thérapeutes PAS ENCORE REVERSÉS
 *    (`TherapistEarning.paidOut = false`) avec la commission en vigueur,
 *    au lieu de l'ancien tarif horaire du thérapeute. Ces rendez-vous ayant
 *    été réservés avant ce système, le pack exact qui les a financés est
 *    inconnu : on utilise le tarif catalogue "séance seule" du type de
 *    thérapie du patient — approximation transparente et documentée.
 *    Les gains déjà reversés ne sont jamais touchés.
 */
import { PrismaClient } from "@prisma/client";
import { SESSION_PRICING, resolveTherapyType } from "../lib/pricing";
import { effectiveCommissionPercent, therapistShare } from "../lib/commission";

const prisma = new PrismaClient();

async function backfillSessionsRemaining() {
  const patients = await prisma.patientProfile.findMany({
    where: { sessionCredits: { gt: 0 } },
    select: { userId: true, sessionCredits: true },
  });

  let updated = 0;
  for (const p of patients) {
    const payment = await prisma.payment.findFirst({
      where: { patientId: p.userId, status: "completed" },
      orderBy: { paidAt: "desc" },
    });
    if (!payment) continue;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { sessionsRemaining: { increment: p.sessionCredits } },
    });
    updated++;
  }
  console.log(`✅ sessionsRemaining amorcé pour ${updated} patient(s) avec des crédits en attente.`);
}

async function recomputeUnpaidEarnings() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  const defaultPercent = Number(settings?.defaultCommissionPercent ?? 20);

  const earnings = await prisma.therapistEarning.findMany({
    where: { paidOut: false },
    select: {
      id: true,
      therapistId: true,
      appointment: {
        select: {
          fundedByPayment: { select: { amount: true, sessionsCount: true } },
          patient: { select: { patientProfile: { select: { onboardingAnswers: true } } } },
        },
      },
    },
  });

  const commissionCache = new Map<number, number | null>();

  let updated = 0;
  for (const e of earnings) {
    if (!commissionCache.has(e.therapistId)) {
      const therapistProfile = await prisma.therapistProfile.findUnique({
        where: { userId: e.therapistId },
        select: { commissionPercent: true },
      });
      commissionCache.set(
        e.therapistId,
        therapistProfile?.commissionPercent ? Number(therapistProfile.commissionPercent) : null
      );
    }

    const commissionPercent = effectiveCommissionPercent(commissionCache.get(e.therapistId) ?? null, defaultPercent);

    const sessionPrice = e.appointment.fundedByPayment
      ? Number(e.appointment.fundedByPayment.amount) / e.appointment.fundedByPayment.sessionsCount
      : SESSION_PRICING[
          resolveTherapyType(
            e.appointment.patient?.patientProfile?.onboardingAnswers as { therapyType?: string } | null
          )
        ].single;

    await prisma.therapistEarning.update({
      where: { id: e.id },
      data: { amount: therapistShare(sessionPrice, commissionPercent), commissionPercent },
    });
    updated++;
  }
  console.log(`✅ ${updated} gain(s) non reversé(s) recalculé(s) avec la nouvelle commission.`);
}

async function main() {
  console.log("🔧 Migration des données vers le modèle de commission...\n");
  await backfillSessionsRemaining();
  await recomputeUnpaidEarnings();
  console.log("\n🎉 Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
