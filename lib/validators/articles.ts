import { z } from "zod";

export const proposeArticleSchema = z.object({
  title: z.string().trim().min(5, "Titre trop court (5 caractères minimum)").max(200, "Titre trop long (200 caractères maximum)"),
  excerpt: z
    .string()
    .trim()
    .min(10, "Accroche trop courte (10 caractères minimum)")
    .max(300, "Accroche trop longue (300 caractères maximum)"),
  body: z.string().trim().min(50, "Le corps de l'article est trop court (50 caractères minimum)"),
  imageUrl: z
    .string()
    .trim()
    .max(512)
    .url("URL d'image invalide")
    .optional()
    .or(z.literal("")),
});

export type ProposeArticleInput = z.infer<typeof proposeArticleSchema>;
