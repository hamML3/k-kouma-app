'use server'

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  registerPatientSchema,
  registerTherapistSchema,
} from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Fetch role before sign-in so we can redirect correctly
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  const redirectTo =
    dbUser?.role === "admin"
      ? "/admin"
      : dbUser?.role === "therapist"
      ? "/dashboard"
      : "/dashboard"; // patients go to /dashboard then /onboarding if needed

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect" };
    }
    throw error;
  }
  return {};
}

export async function registerPatientAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phoneRaw = formData.get("phoneNumber") as string;

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    phoneNumber: phoneRaw || undefined,
    nickname: formData.get("nickname") as string,
    timezone: (formData.get("timezone") as string) || "UTC",
  };

  const parsed = registerPatientSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, phoneNumber, nickname, timezone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte avec cet email existe déjà" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      phoneNumber,
      role: "patient",
      patientProfile: {
        create: { nickname, timezone },
      },
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/onboarding" });
  } catch (error) {
    throw error;
  }
  return {};
}

export async function registerTherapistAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const phoneRaw = formData.get("phoneNumber") as string;
  const hourlyRateRaw = formData.get("hourlyRate") as string;

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    phoneNumber: phoneRaw || undefined,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    specialties: (formData.get("specialties") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
    hourlyRate: hourlyRateRaw ? Number(hourlyRateRaw) : 0,
    languages: (formData.get("languages") as string) || undefined,
  };

  const parsed = registerTherapistSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const {
    email,
    password,
    phoneNumber,
    firstName,
    lastName,
    specialties,
    bio,
    hourlyRate,
    languages,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte avec cet email existe déjà" };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "diplomas");
  await mkdir(uploadDir, { recursive: true });

  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

  async function saveFile(file: File | null, label: string): Promise<{ label: string; url: string } | null> {
    if (!file || file.size === 0) return null;
    if (file.size > 5 * 1024 * 1024) return null;
    if (!allowed.includes(file.type)) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return { label, url: `/uploads/diplomas/${filename}` };
  }

  const diplomaFile = formData.get("diploma") as File | null;
  const idCardFile = formData.get("idCard") as File | null;
  const document2File = formData.get("document2") as File | null;

  const uploadResults = await Promise.all([
    saveFile(diplomaFile, "Diplôme"),
    saveFile(idCardFile, "Pièce d'identité"),
    saveFile(document2File, "Document complémentaire"),
  ]);

  const savedDocs = uploadResults.filter(Boolean) as { label: string; url: string }[];
  const diplomaUrl = savedDocs[0]?.url ?? undefined;
  const documentsJson = savedDocs.length > 0 ? savedDocs : undefined;

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        phoneNumber,
        role: "therapist",
        therapistProfile: {
          create: {
            firstName,
            lastName,
            specialties,
            bio,
            hourlyRate,
            languages,
            isVerified: false,
            diplomaUrl,
            documentsJson,
          },
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("phone_number")) {
      return { error: "Ce numéro de téléphone est déjà associé à un compte." };
    }
    if (msg.includes("email") || msg.includes("users_email")) {
      return { error: "Un compte avec cet email existe déjà." };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }

  redirect("/register/therapist/pending");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
