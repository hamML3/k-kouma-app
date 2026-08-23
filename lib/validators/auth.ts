import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
});

export const registerPatientSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide").optional(),
  nickname: z.string().min(2).max(50),
  timezone: z.string().default("UTC"),
});

export const registerTherapistSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
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
  password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterTherapistInput = z.infer<typeof registerTherapistSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
