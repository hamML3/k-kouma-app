'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type OnboardingAnswers = {
  therapyType?: string;
  motifs?: string[];
  mood?: string;
  duration?: string;
  previousTherapy?: string;
  safety?: string;
  langue?: string;
  mode?: string;
  therapistGender?: string;
};

export async function saveOnboardingAnswers(answers: OnboardingAnswers): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "patient") redirect("/dashboard");
  const userId = Number(session.user.id);

  await prisma.patientProfile.update({
    where: { userId },
    data: { onboardingAnswers: answers },
  });

  // Le patient vient de répondre pour être orienté : on lui montre tout de
  // suite les recommandations, avec un bandeau qui rappelle que rien ne presse
  // (choix possible plus tard depuis le tableau de bord).
  redirect("/therapists?questionnaire=1");
}
