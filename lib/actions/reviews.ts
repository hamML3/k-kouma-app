'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { notifyStaff } from "@/lib/notifications";

const MAX_COMMENT_LENGTH = 1000;

export type SubmitReviewState = { error?: string; success?: boolean };

export async function submitReviewAction(
  _prevState: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "patient") {
    return { error: "Seuls les patients peuvent laisser un avis." };
  }

  const patientId = Number(session.user.id);
  const appointmentId = Number(formData.get("appointmentId"));
  const rating = Number(formData.get("rating"));
  const comment = ((formData.get("comment") as string) ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choisissez une note de 1 à 5." };
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return { error: `Commentaire trop long (${MAX_COMMENT_LENGTH} caractères maximum).` };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId || 0, patientId, status: "completed" },
    select: { therapistId: true },
  });
  if (!appointment) return { error: "Seule une séance terminée peut recevoir un avis." };

  try {
    await prisma.sessionReview.create({
      data: {
        appointmentId,
        patientId,
        therapistId: appointment.therapistId,
        rating,
        comment: comment || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Vous avez déjà donné votre avis sur cette séance." };
    }
    console.error("[review] création échouée:", err);
    return { error: "Une erreur est survenue. Réessayez." };
  }

  await notifyStaff("manage_reports", {
    type: "review.submitted",
    title: "Nouvel avis à relire",
    link: "/admin/reviews",
  });

  revalidatePath("/appointments");
  revalidatePath("/admin/reviews");
  return { success: true };
}

async function requireReviewModerator(): Promise<{ id: number; email: string }> {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, "manage_reports")) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email };
}

async function moderate(formData: FormData, status: "published" | "hidden") {
  const moderator = await requireReviewModerator();
  const reviewId = Number(formData.get("reviewId"));
  if (!reviewId) return;

  const review = await prisma.sessionReview.findUnique({
    where: { id: reviewId },
    select: { therapist: { select: { therapistProfile: { select: { id: true } } } } },
  });
  if (!review) return;

  await prisma.sessionReview.update({
    where: { id: reviewId },
    data: { status, moderatedById: moderator.id, moderatedAt: new Date() },
  });

  await logAudit({
    actor: moderator,
    action: status === "published" ? "review.publish" : "review.hide",
    targetType: "session_review",
    targetId: reviewId,
  });

  revalidatePath("/admin/reviews");
  if (review.therapist.therapistProfile) {
    revalidatePath(`/therapists/${review.therapist.therapistProfile.id}`);
  }
}

export async function publishReviewAction(formData: FormData): Promise<void> {
  await moderate(formData, "published");
}

export async function hideReviewAction(formData: FormData): Promise<void> {
  await moderate(formData, "hidden");
}
