import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
});

// Appliqué uniquement là où un NOUVEAU mot de passe est choisi (inscription,
// réinitialisation) — jamais sur loginSchema, pour ne pas rejeter la
// connexion de comptes existants créés avant cette règle.
const newPassword = z
  .string()
  .min(8, "Mot de passe trop court (8 caractères minimum)")
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

// Case à cocher HTML : présente ("on") si cochée, absente du FormData sinon.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const registerPatientSchema = z
  .object({
    email: z.string().email("Email invalide"),
    password: newPassword,
    phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide").optional(),
    nickname: z.string().min(2).max(50),
    timezone: z.string().default("UTC"),
    // Les 5 cases du document "Consentement au traitement des données
    // relatives à la santé" — toutes requises avant la création du compte.
    consentPrivacyRead: checkbox,
    consentHealthDataNeeded: checkbox,
    consentDataProcessing: checkbox,
    consentInfoAccurate: checkbox,
    consentNotEmergency: checkbox,
  })
  .refine(
    (data) =>
      data.consentPrivacyRead &&
      data.consentHealthDataNeeded &&
      data.consentDataProcessing &&
      data.consentInfoAccurate &&
      data.consentNotEmergency,
    {
      message:
        "Merci de cocher les 5 cases du consentement au traitement des données de santé pour créer votre compte.",
    }
  );

export const registerTherapistSchema = z.object({
  email: z.string().email("Email invalide"),
  password: newPassword,
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide").optional(),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  specialties: z.string().optional(),
  bio: z.string().max(2000).optional(),
  hourlyRate: z.number().min(0).default(0),
  languages: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: newPassword,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterTherapistInput = z.infer<typeof registerTherapistSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
