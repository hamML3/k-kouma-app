import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./_client";
import { getPlatformSettings } from "@/lib/platformSettings";

export const metadata = {
  title: "Questionnaire d'admission — K-Kouma",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Questionnaire réservé aux patients (saveOnboardingAnswers le refuse aux autres).
  if (session.user.role !== "patient") redirect("/dashboard");

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: Number(session.user.id) },
    select: { onboardingAnswers: true },
  });

  // Questionnaire déjà rempli : on montre directement les recommandations.
  if (profile?.onboardingAnswers) redirect("/therapists");

  const userId = Number(session.user.id);

  // Pas d'option coaching tant qu'aucun coach ne peut être proposé.
  const [settings, coaches] = await Promise.all([
    getPlatformSettings(),
    prisma.therapistProfile.count({
      where: { practitionerKind: "coach", isVerified: true, user: { status: "active" } },
    }),
  ]);
  const coachingAvailable = (settings?.showLifeCoachCard ?? true) && coaches > 0;

  return <OnboardingClient userId={userId} coachingAvailable={coachingAvailable} />;
}
