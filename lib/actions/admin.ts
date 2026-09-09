'use server'

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createUserSchema } from "@/lib/validators/admin";

export type CreateUserState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/** Création directe d'un compte par un admin (patient, thérapeute ou autre admin) — sans passer par l'inscription publique. */
export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    nickname: (formData.get("nickname") as string) || undefined,
    firstName: (formData.get("firstName") as string) || undefined,
    lastName: (formData.get("lastName") as string) || undefined,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, role, nickname, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte avec cet email existe déjà." };

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      status: "active",
      emailVerifiedAt: new Date(), // créé par un admin — pas besoin de revérifier l'email
      ...(role === "patient" && {
        patientProfile: { create: { nickname: nickname!, timezone: "Africa/Bamako" } },
      }),
      ...(role === "therapist" && {
        therapistProfile: {
          create: { firstName: firstName!, lastName: lastName!, isVerified: true },
        },
      }),
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function suspendUserAction(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "suspended" } });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function reactivateUserAction(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/users");

  await prisma.user.update({ where: { id: userId }, data: { status: "active" } });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function suspendUser(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function unsuspendUser(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function verifyTherapist(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { isVerified: true, rejectedAt: null },
  });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}

export async function rejectTherapist(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { rejectedAt: new Date(), isVerified: false },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}
