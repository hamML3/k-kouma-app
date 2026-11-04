'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { notifyStaff } from "@/lib/notifications";
import { isReportCategory } from "@/lib/reportCategories";

export type FileReportState = {
  error?: string;
  success?: boolean;
};

/**
 * Vérifie que `counterpartId` est bien un interlocuteur légitime de
 * `callerId` — son psychologue assigné (ou l'ayant été), ou l'un de ses
 * patients (actuel ou passé, via une assignation ou un rendez-vous commun).
 * Ne jamais faire confiance à un `reportedId` fourni par le client sans ce
 * contrôle : c'est la même logique de vérification de relation que
 * lib/actions/appointments.ts (PatientTherapistAssignment).
 */
async function isLegitimateCounterpart(
  callerId: number,
  callerRole: "patient" | "therapist",
  counterpartId: number
): Promise<boolean> {
  const patientId = callerRole === "patient" ? callerId : counterpartId;
  const therapistId = callerRole === "patient" ? counterpartId : callerId;

  const [assignment, appointment] = await Promise.all([
    prisma.patientTherapistAssignment.findFirst({
      where: { patientId, therapistId },
      select: { id: true },
    }),
    prisma.appointment.findFirst({
      where: { patientId, therapistId },
      select: { id: true },
    }),
  ]);

  return Boolean(assignment || appointment);
}

/** Dépose un signalement — tout patient ou psychologue authentifié, à tout moment (y compris pendant un appel/une conversation en cours). */
export async function fileReportAction(
  _prevState: FileReportState,
  formData: FormData
): Promise<FileReportState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Vous devez être connecté pour déposer un signalement." };
  }

  const role = session.user.role;
  if (role !== "patient" && role !== "therapist") {
    return { error: "Seuls les patients et les psychologues peuvent déposer un signalement." };
  }

  const callerId = Number(session.user.id);
  const reportedId = Number(formData.get("reportedId"));
  const category = formData.get("category") as string;
  const message = ((formData.get("message") as string) || "").trim();
  const appointmentIdRaw = formData.get("appointmentId");
  const appointmentId = appointmentIdRaw ? Number(appointmentIdRaw) : null;

  if (!reportedId || reportedId === callerId) {
    return { error: "Compte signalé invalide." };
  }
  if (!isReportCategory(category)) {
    return { error: "Merci de choisir un motif." };
  }
  if (message.length > 2000) {
    return { error: "Message trop long (2000 caractères maximum)." };
  }

  const legitimate = await isLegitimateCounterpart(callerId, role, reportedId);
  if (!legitimate) {
    return {
      error:
        role === "patient"
          ? "Vous ne pouvez signaler que votre psychologue."
          : "Vous ne pouvez signaler que l'un de vos patients.",
    };
  }

  // Si une séance précise est citée, vérifier qu'elle concerne bien ces deux comptes.
  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, therapistId: true },
    });
    const matches =
      appointment &&
      ((role === "patient" && appointment.patientId === callerId && appointment.therapistId === reportedId) ||
        (role === "therapist" && appointment.therapistId === callerId && appointment.patientId === reportedId));
    if (!matches) {
      return { error: "Rendez-vous invalide." };
    }
  }

  const created = await prisma.report.create({
    data: {
      reporterId: callerId,
      reportedId,
      appointmentId,
      category,
      message: message || null,
    },
  });

  await logAudit({
    actor: { id: callerId, email: session.user.email },
    action: "report.file",
    targetType: "user",
    targetId: reportedId,
    metadata: { category, appointmentId, reportId: created.id },
  });

  // Ni nom ni motif ici : le contenu reste réservé à /admin/reports, et le
  // compte signalé n'est jamais prévenu.
  await notifyStaff("manage_reports", {
    type: "report.filed",
    title: "Nouveau signalement à examiner",
    link: "/admin/reports",
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin");

  return { success: true };
}

/**
 * Accès réservé à l'admin, ou au modérateur titulaire de `manage_reports` —
 * contrairement aux autres permissions, celle-ci conditionne aussi la simple
 * lecture de /admin/reports (voir app/admin/reports/page.tsx), pas seulement
 * la capacité d'agir : le contenu d'un signalement est plus sensible qu'une
 * donnée financière.
 */
async function requireReportsReviewer(): Promise<{ id: number; email: string; role: string }> {
  const session = await auth();
  if (!session?.user?.email || !hasPermission(session.user.role, session.user.permissions, "manage_reports")) {
    throw new Error("Accès refusé.");
  }
  return { id: Number(session.user.id), email: session.user.email, role: session.user.role };
}

/** Marque un signalement comme traité (action prise ou situation clarifiée côté admin). */
export async function reviewReportAction(formData: FormData): Promise<void> {
  const admin = await requireReportsReviewer();
  const reportId = Number(formData.get("reportId"));
  if (!reportId) redirect("/admin/reports");

  await prisma.report.updateMany({
    where: { id: reportId, status: "pending" },
    data: { status: "reviewed", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({ actor: admin, action: "report.review", targetType: "report", targetId: reportId });

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/reports");
}

/** Classe un signalement sans suite (ex: motif non fondé). */
export async function dismissReportAction(formData: FormData): Promise<void> {
  const admin = await requireReportsReviewer();
  const reportId = Number(formData.get("reportId"));
  if (!reportId) redirect("/admin/reports");

  await prisma.report.updateMany({
    where: { id: reportId, status: "pending" },
    data: { status: "dismissed", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await logAudit({ actor: admin, action: "report.dismiss", targetType: "report", targetId: reportId });

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/reports");
}
