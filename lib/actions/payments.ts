'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createInvoice, isPaydunyaConfigured } from "@/lib/paydunya";
import { SESSION_PRICING, CURRENCY, sessionsCountFor, amountFor, type TherapyType } from "@/lib/pricing";

export type BuySessionsState = { error?: string };

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function buySessionsAction(
  _prevState: BuySessionsState,
  formData: FormData
): Promise<BuySessionsState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "patient") redirect("/login");

  const pack = formData.get("pack") as "single" | "pack4";
  if (pack !== "single" && pack !== "pack4") {
    return { error: "Sélection invalide." };
  }

  if (!isPaydunyaConfigured()) {
    return {
      error:
        "Le paiement en ligne n'est pas encore actif (compte PayDunya en cours d'approbation). Réessayez bientôt.",
    };
  }

  const patientId = Number(session.user.id);

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: {
      email: true,
      patientProfile: { select: { nickname: true, onboardingAnswers: true } },
    },
  });
  if (!patient) return { error: "Compte introuvable." };

  // Le type de thérapie est celui choisi par le patient à l'onboarding — jamais
  // une valeur envoyée par le formulaire, pour éviter de payer un pack "enfant"
  // moins cher tout en réservant des séances "couple".
  const answers = patient.patientProfile?.onboardingAnswers as { therapyType?: string } | null;
  const therapyType: TherapyType =
    answers?.therapyType === "couple" || answers?.therapyType === "enfant"
      ? answers.therapyType
      : "individuelle";

  const amount = amountFor(therapyType, pack);
  const sessionsCount = sessionsCountFor(pack);

  const payment = await prisma.payment.create({
    data: {
      patientId,
      therapyType,
      sessionsCount,
      amount,
      currency: CURRENCY,
      provider: "paydunya",
      status: "pending",
    },
  });

  try {
    const invoice = await createInvoice({
      description: `K-Kouma — ${sessionsCount === 1 ? "1 séance" : "Pack 4 séances"} (${SESSION_PRICING[therapyType].label})`,
      amount,
      customerEmail: patient.email,
      customerName: patient.patientProfile?.nickname ?? patient.email,
      customData: { paymentId: payment.id },
      callbackUrl: `${APP_URL}/api/payments/paydunya/webhook`,
      returnUrl: `${APP_URL}/subscription?paid=1`,
      cancelUrl: `${APP_URL}/subscription?canceled=1`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: invoice.token },
    });

    redirect(invoice.invoiceUrl);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
    console.error("[paydunya] création de facture échouée:", err);
    return { error: "Impossible de démarrer le paiement pour le moment. Réessayez plus tard." };
  }
}
