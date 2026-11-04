'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return Number(session.user.id);
}

function refreshNotificationViews() {
  revalidatePath("/notifications");
  // La cloche du back-office vit dans le layout, que la navigation ne recharge pas.
  revalidatePath("/admin", "layout");
}

/** Le lien vient de la base, jamais du formulaire : un POST direct ne peut pas rediriger ailleurs. */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = Number(formData.get("notificationId"));
  if (!id) return;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { link: true, readAt: true },
  });
  if (!notification) return;

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    refreshNotificationViews();
  }
  if (notification.link) redirect(notification.link);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  refreshNotificationViews();
}
