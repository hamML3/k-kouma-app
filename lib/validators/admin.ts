import { z } from "zod";

export const createUserSchema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Mot de passe trop court (8 caractères minimum)"),
    role: z.enum(["admin", "therapist", "patient"]),
    nickname: z.string().min(2).max(50).optional(),
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
  })
  .refine((data) => data.role !== "patient" || Boolean(data.nickname), {
    message: "Le pseudonyme est requis pour un patient",
    path: ["nickname"],
  })
  .refine((data) => data.role !== "therapist" || Boolean(data.firstName && data.lastName), {
    message: "Prénom et nom sont requis pour un psychologue",
    path: ["firstName"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
