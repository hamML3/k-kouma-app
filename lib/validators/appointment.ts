import { z } from "zod";

export const createAppointmentSchema = z.object({
  therapistId: z.number().int().positive(),
  scheduledAt: z.string().datetime("Date invalide"),
  durationMinutes: z.number().int().min(15).max(120).default(45),
  type: z.enum(["text", "audio", "video"]).default("video"),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(["confirmed", "canceled", "completed"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
