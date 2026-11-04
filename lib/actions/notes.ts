'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { encryptNote } from "@/lib/noteEncryption";

const MAX_NOTE_LENGTH = 5000;

async function requireTherapist(): Promise<{ id: number; email?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");
  return { id: Number(session.user.id), email: session.user.email ?? undefined };
}

export async function addTherapistNoteAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();
  const patientId = Number(formData.get("patientId"));
  const body = ((formData.get("body") as string) ?? "").trim();
  if (!patientId || !body || body.length > MAX_NOTE_LENGTH) return;

  // Même règle que la fiche patient : il faut un rendez-vous en commun.
  const relation = await prisma.appointment.findFirst({
    where: { therapistId: therapist.id, patientId },
    select: { id: true },
  });
  if (!relation) return;

  let encrypted: string;
  try {
    encrypted = encryptNote(body, { therapistId: therapist.id, patientId });
  } catch (err) {
    console.error("[note] chiffrement impossible:", err);
    redirect(`/patients/${patientId}?noteError=1`);
  }

  const note = await prisma.therapistNote.create({
    data: { therapistId: therapist.id, patientId, body: encrypted },
  });

  await logAudit({
    actor: therapist,
    action: "therapist_note.create",
    targetType: "therapist_note",
    targetId: note.id,
    metadata: { patientId },
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function deleteTherapistNoteAction(formData: FormData): Promise<void> {
  const therapist = await requireTherapist();
  const id = Number(formData.get("noteId"));
  if (!id) return;

  const note = await prisma.therapistNote.findFirst({
    where: { id, therapistId: therapist.id },
    select: { patientId: true },
  });
  if (!note) return;

  await prisma.therapistNote.delete({ where: { id } });

  await logAudit({
    actor: therapist,
    action: "therapist_note.delete",
    targetType: "therapist_note",
    targetId: id,
    metadata: { patientId: note.patientId },
  });

  revalidatePath(`/patients/${note.patientId}`);
}
