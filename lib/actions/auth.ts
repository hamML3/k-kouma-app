'use server'

import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  registerPatientSchema,
  registerTherapistSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import {
  createVerificationToken,
  consumeVerificationToken,
  invalidatePendingTokens,
} from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp, retryAfterMessage } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

/** Génère et envoie l'email de vérification ; n'échoue jamais l'appelant si Resend est indisponible. */
async function dispatchVerificationEmail(userId: number, email: string, name: string) {
  try {
    const token = await createVerificationToken(userId, "email_verify");
    await sendVerificationEmail(email, name, token);
  } catch (err) {
    console.error("[email_verify] envoi échoué:", err);
  }
}

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

  const ip = await clientIp();
  const byEmail = rateLimit(`login:email:${email.toLowerCase()}`, 8, 10 * 60 * 1000);
  const byIp = rateLimit(`login:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!byEmail.allowed || !byIp.allowed) {
    return { error: retryAfterMessage(Math.max(byEmail.retryAfterMs, byIp.retryAfterMs)) };
  }

  // Fetch role before sign-in so we can redirect correctly
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
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
      await logAudit({ actor: null, action: "auth.login.failed", metadata: { email } });
      return { error: "Email ou mot de passe incorrect" };
    }
    // next-auth signale un succès en levant l'erreur interne de redirection —
    // on journalise donc ici, juste avant de la relancer.
    if (dbUser) {
      await logAudit({ actor: { id: dbUser.id, email }, action: "auth.login.success" });
    }
    throw error;
  }
  return {};
}

export async function registerPatientAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const ip = await clientIp();
  const byIp = rateLimit(`register:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!byIp.allowed) {
    return { error: retryAfterMessage(byIp.retryAfterMs) };
  }

  const phoneRaw = formData.get("phoneNumber") as string;

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    phoneNumber: phoneRaw || undefined,
    nickname: formData.get("nickname") as string,
    timezone: (formData.get("timezone") as string) || "UTC",
    consentPrivacyRead: (formData.get("consentPrivacyRead") as string) || undefined,
    consentHealthDataNeeded: (formData.get("consentHealthDataNeeded") as string) || undefined,
    consentDataProcessing: (formData.get("consentDataProcessing") as string) || undefined,
    consentInfoAccurate: (formData.get("consentInfoAccurate") as string) || undefined,
    consentNotEmergency: (formData.get("consentNotEmergency") as string) || undefined,
  };

  const parsed = registerPatientSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    // Les cases de consentement échouent au niveau de l'objet entier (.refine) :
    // on remonte ce message en haut du formulaire plutôt qu'en erreur de champ.
    if (flat.formErrors.length > 0) {
      return { error: flat.formErrors[0], fieldErrors: flat.fieldErrors };
    }
    return { fieldErrors: flat.fieldErrors };
  }

  const { email, password, phoneNumber, nickname, timezone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte avec cet email existe déjà" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      phoneNumber,
      role: "patient",
      patientProfile: {
        create: { nickname, timezone, healthDataConsentAt: new Date() },
      },
    },
  });

  await dispatchVerificationEmail(user.id, email, nickname);

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
  const ip = await clientIp();
  const byIp = rateLimit(`register:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!byIp.allowed) {
    return { error: retryAfterMessage(byIp.retryAfterMs) };
  }

  const phoneRaw = formData.get("phoneNumber") as string;

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    phoneNumber: phoneRaw || undefined,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    specialties: (formData.get("specialties") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
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
    const user = await prisma.user.create({
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

    await dispatchVerificationEmail(user.id, email, firstName);
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

/** Résultat d'une tentative de vérification d'email, consommé par la page /verify-email. */
export type VerifyEmailResult = "success" | "already_verified" | "invalid" | "expired";

export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  const result = await consumeVerificationToken(token, "email_verify");

  if (!result.ok) {
    if (result.reason === "invalid") return "invalid";
    // Lien réutilisé (ex: page rechargée) après un succès précédent : si le
    // compte est déjà vérifié, ce n'est pas une erreur — on le confirme calmement.
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { emailVerifiedAt: true },
    });
    if (result.reason === "used" && user?.emailVerifiedAt) return "already_verified";
    return result.reason === "expired" ? "expired" : "invalid";
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerifiedAt: new Date() },
  });

  return "success";
}

export type ResendState = { message?: string; error?: string };

/** Renvoie l'email de vérification au compte actuellement connecté (limité à 1 par minute). */
export async function resendVerificationEmailAction(
  _prevState: ResendState
): Promise<ResendState> {
  const session = await auth();
  if (!session?.user) return { error: "Vous devez être connecté." };

  const userId = Number(session.user.id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      emailVerifiedAt: true,
      patientProfile: { select: { nickname: true } },
      therapistProfile: { select: { firstName: true } },
    },
  });
  if (!user) return { error: "Compte introuvable." };
  if (user.emailVerifiedAt) return { message: "Votre email est déjà vérifié." };

  const recent = await prisma.verificationToken.findFirst({
    where: {
      userId,
      type: "email_verify",
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recent) return { error: "Merci de patienter une minute avant de renvoyer l'email." };

  await invalidatePendingTokens(userId, "email_verify");
  const name = user.patientProfile?.nickname ?? user.therapistProfile?.firstName ?? "";
  await dispatchVerificationEmail(userId, user.email, name);

  return { message: "Email de vérification renvoyé." };
}

export type ForgotPasswordState = { message?: string; error?: string };

/**
 * Envoie un lien de réinitialisation si l'email correspond à un compte.
 * Renvoie toujours le même message, que le compte existe ou non (anti-énumération).
 */
export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Adresse email invalide." };
  }

  const ip = await clientIp();
  const byEmail = rateLimit(`forgot:email:${parsed.data.email.toLowerCase()}`, 5, 60 * 60 * 1000);
  const byIp = rateLimit(`forgot:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!byEmail.allowed || !byIp.allowed) {
    return { error: retryAfterMessage(Math.max(byEmail.retryAfterMs, byIp.retryAfterMs)) };
  }

  const genericMessage =
    "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.";

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      patientProfile: { select: { nickname: true } },
      therapistProfile: { select: { firstName: true } },
    },
  });
  if (!user) return { message: genericMessage };

  try {
    await invalidatePendingTokens(user.id, "password_reset");
    const token = await createVerificationToken(user.id, "password_reset");
    await logAudit({ actor: { id: user.id, email: user.email }, action: "auth.password_reset.requested" });
    const name = user.patientProfile?.nickname ?? user.therapistProfile?.firstName ?? "";
    await sendPasswordResetEmail(user.email, name, token);
  } catch (err) {
    console.error("[password_reset] envoi échoué:", err);
  }

  return { message: genericMessage };
}

export type ResetPasswordState = { error?: string; success?: boolean };

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.password?.[0] ?? "Formulaire invalide." };
  }

  const result = await consumeVerificationToken(parsed.data.token, "password_reset");
  if (!result.ok) {
    return {
      error:
        result.reason === "expired"
          ? "Ce lien a expiré. Demandez-en un nouveau."
          : "Ce lien n'est plus valide. Demandez-en un nouveau.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });
  await logAudit({ actor: { id: result.userId }, action: "auth.password_reset.completed" });

  return { success: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
