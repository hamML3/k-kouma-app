'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ProfileState = { success?: boolean; error?: string };

export async function updateTherapistProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const userId = Number(formData.get("userId"));
  if (!userId) return { error: "Session invalide. Reconnectez-vous." };

  const profile = await prisma.therapistProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return { error: "Profil introuvable." };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName  = (formData.get("lastName")  as string)?.trim();
  if (!firstName || !lastName) return { error: "Prénom et nom requis." };

  const bio         = (formData.get("bio")         as string)?.trim() || null;
  const languages   = (formData.get("languages")   as string)?.trim() || null;
  const specialties = (formData.get("specialties") as string)?.trim() || null;

  await prisma.therapistProfile.update({
    where: { userId },
    data: { firstName, lastName, bio, languages, specialties },
  });

  revalidatePath("/profile");
  revalidatePath("/therapists");
  revalidatePath("/dashboard");

  return { success: true };
}
