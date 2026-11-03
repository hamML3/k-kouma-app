'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createInvoice, isPaydunyaConfigured } from "@/lib/paydunya";
import { SESSION_PRICING, CURRENCY, sessionsCountFor, amountFor, resolveTherapyType } from "@/lib/pricing";
import { declareManualPaymentSchema } from "@/lib/validators/payments";

export type BuySessionsState = { error?: string };

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function buySessionsAction(
  _prevState: BuySessionsState,
  formData: FormData
): Promise<BuySessionsState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "patient") redirect("/login");

  const pack = formData.get("pack") as "single" | "pack3";
  if (pack !== "single" && pack !== "pack3") {
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
  const therapyType = resolveTherapyType(answers);

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
      description: `K-Kouma — ${sessionsCount === 1 ? "1 séance" : "Pack 3 séances"} (${SESSION_PRICING[therapyType].label})`,
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

export type DeclareManualPaymentState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/**
 * Pont manuel Orange Money : le patient a déjà envoyé l'argent (appli ou
 * USSD) vers le numéro marchand publié, et déclare ici la référence reçue.
 * Le paiement reste "pending" tant qu'un admin ne l'a pas vérifié et validé
 * depuis /admin/finances — voir confirmManualPaymentAction.
 */
export async function declareManualPaymentAction(
  _prevState: DeclareManualPaymentState,
  formData: FormData
): Promise<DeclareManualPaymentState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "patient") redirect("/login");

  const parsed = declareManualPaymentSchema.safeParse({
    pack: formData.get("pack"),
    reference: formData.get("reference"),
    payerPhone: formData.get("payerPhone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const patientId = Number(session.user.id);
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { patientProfile: { select: { onboardingAnswers: true } } },
  });

  const answers = patient?.patientProfile?.onboardingAnswers as { therapyType?: string } | null;
  const therapyType = resolveTherapyType(answers);
  const amount = amountFor(therapyType, parsed.data.pack);
  const sessionsCount = sessionsCountFor(parsed.data.pack);

  try {
    await prisma.payment.create({
      data: {
        patientId,
        therapyType,
        sessionsCount,
        amount,
        currency: CURRENCY,
        provider: "orange_money_manual",
        providerRef: parsed.data.reference,
        payerPhone: parsed.data.payerPhone,
        status: "pending",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("provider_ref")) {
      return { error: "Cette référence de transaction a déjà été déclarée." };
    }
    console.error("[orange_money_manual] déclaration échouée:", err);
    return { error: "Une erreur est survenue. Réessayez." };
  }

  revalidatePath("/subscription");
  return { success: true };
}
