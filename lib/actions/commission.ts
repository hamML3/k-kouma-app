'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { effectiveCommissionPercent } from "@/lib/commission";

/** Le thérapeute accepte explicitement le pourcentage de commission en vigueur — couverture juridique. */
export async function acceptCommissionTermsAction(): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "therapist") redirect("/login");

  const userId = Number(session.user.id);

  const [profile, settings] = await Promise.all([
    prisma.therapistProfile.findUnique({ where: { userId }, select: { commissionPercent: true } }),
    prisma.platformSettings.findUnique({ where: { id: 1 } }),
  ]);

  const effective = effectiveCommissionPercent(
    profile?.commissionPercent ? Number(profile.commissionPercent) : null,
    Number(settings?.defaultCommissionPercent ?? 20)
  );

  await prisma.therapistProfile.update({
    where: { userId },
    data: { commissionAcceptedPercent: effective, commissionAcceptedAt: new Date() },
  });

  await logAudit({
    actor: { id: userId, email: session.user.email ?? undefined },
    action: "therapist.commission.accept",
    targetType: "user",
    targetId: userId,
    metadata: { commissionPercent: effective },
  });

  redirect("/dashboard");
}
