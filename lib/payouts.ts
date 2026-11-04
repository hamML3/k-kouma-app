import { prisma } from "@/lib/prisma";

/**
 * Marque tous les gains non reversés d'un thérapeute comme payés, en une
 * fois. Logique centrale partagée par markTherapistPayoutAction
 * (lib/actions/admin.ts — initiative spontanée d'un admin) et
 * approvePayoutRequestAction (lib/actions/payouts.ts — suite à une demande
 * explicite du thérapeute), pour ne jamais la dupliquer entre les deux.
 *
 * Volontairement non `async` : la valeur retournée est directement la
 * requête Prisma (un "PrismaPromise"), ce qui permet de l'utiliser aussi
 * bien en appel autonome (`await markTherapistEarningsPaid(id)`) que comme
 * étape d'un `prisma.$transaction([...])`, où chaque élément du tableau doit
 * être une requête Prisma non encapsulée dans une autre Promise.
 */
export function markTherapistEarningsPaid(therapistId: number) {
  return prisma.therapistEarning.updateMany({
    where: { therapistId, paidOut: false },
    data: { paidOut: true, paidOutAt: new Date() },
  });
}
