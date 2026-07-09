'use server'

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function suspendUser(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function unsuspendUser(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  });

  revalidatePath("/admin/therapists");
  revalidatePath(`/admin/therapists/${userId}`);
  redirect(`/admin/therapists/${userId}`);
}

export async function verifyTherapist(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { isVerified: true, rejectedAt: null },
  });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}

export async function rejectTherapist(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  if (!userId) redirect("/admin/therapists");

  await prisma.therapistProfile.update({
    where: { userId },
    data: { rejectedAt: new Date(), isVerified: false },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });

  revalidatePath("/admin/therapists");
  redirect("/admin/therapists");
}
