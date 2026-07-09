'use server'

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

// userId comes from the server component that verified the session —
// no auth() call needed inside the action.
export async function saveOnboardingAnswers(
  userId: number,
  answers: OnboardingAnswers
): Promise<void> {
  if (!userId) redirect("/login");

  await prisma.patientProfile.update({
    where: { userId },
    data: { onboardingAnswers: answers },
  });

  redirect("/therapists");
}
