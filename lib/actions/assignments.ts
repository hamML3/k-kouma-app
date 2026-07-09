'use server'

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Patient chooses a therapist — deactivates any existing active assignment first
export async function chooseTherapistAction(formData: FormData): Promise<void> {
  const patientId   = Number(formData.get("patientId"));
  const therapistId = Number(formData.get("therapistId"));

  if (!patientId || !therapistId) redirect("/therapists");

  // Deactivate any currently active assignment for this patient
  await prisma.patientTherapistAssignment.updateMany({
    where: { patientId, status: "active" },
    data:  { status: "paused" },
  });

  // Upsert the new assignment
  await prisma.patientTherapistAssignment.upsert({
    where:  { patientId_therapistId: { patientId, therapistId } },
    create: { patientId, therapistId, status: "active" },
    update: { status: "active" },
  });

  revalidatePath("/dashboard");
  revalidatePath("/therapists");
  redirect("/therapists?chosen=1");
}

// Patient changes their therapist
export async function changeTherapistAction(formData: FormData): Promise<void> {
  const patientId = Number(formData.get("patientId"));
  if (!patientId) redirect("/dashboard");

  await prisma.patientTherapistAssignment.updateMany({
    where: { patientId, status: "active" },
    data:  { status: "paused" },
  });

  revalidatePath("/dashboard");
  redirect("/therapists");
}

