'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizeSpecialties, splitSpecialties } from "@/lib/specialties";

export type ProfileState = { success?: boolean; error?: string };

export async function updateTherapistProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  // L'identité vient de la session, jamais d'un champ du formulaire.
  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!userId || session?.user?.role !== "therapist") {
    return { error: "Session invalide. Reconnectez-vous." };
  }

  const profile = await prisma.therapistProfile.findUnique({
    where: { userId },
    select: { id: true, specialties: true, practitionerKind: true },
  });
  if (!profile) return { error: "Profil introuvable." };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName  = (formData.get("lastName")  as string)?.trim();
  if (!firstName || !lastName) return { error: "Prénom et nom requis." };

  const bio         = (formData.get("bio")         as string)?.trim() || null;
  const languages   = (formData.get("languages")   as string)?.trim() || null;

  // Les anciennes valeurs déjà enregistrées (hors liste actuelle) restent
  // acceptées pour ne pas les effacer à chaque sauvegarde du profil.
  const specialtiesResult = normalizeSpecialties(formData.get("specialties") as string | null, {
    extraAllowed: splitSpecialties(profile.specialties),
    kind: profile.practitionerKind,
  });
  if (!specialtiesResult.ok) return { error: specialtiesResult.error };
  const specialties = specialtiesResult.value;

  await prisma.therapistProfile.update({
    where: { userId },
    data: { firstName, lastName, bio, languages, specialties },
  });

  revalidatePath("/profile");
  revalidatePath("/therapists");
  revalidatePath("/dashboard");

  return { success: true };
}
