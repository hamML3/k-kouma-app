import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";
import { scheduleStaffAlert, type StaffAlertFacts } from "@/lib/telegram";

export type NotificationContent = {
  type: string;
  title: string;
  body?: string;
  link?: string;
  /**
   * Faits non sensibles repris par l'alerte Telegram de l'équipe (staff
   * uniquement, voir lib/telegram.ts). Jamais affichés dans l'application.
   */
  alert?: StaffAlertFacts;
};

/** Le lien part dans un redirect() : tout ce qui n'est pas un chemin interne est écarté. */
export function internalLink(link: string | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) return null;
  return link.slice(0, 512);
}

/**
 * N'échoue jamais l'appelant : comme l'email et le journal d'audit, une
 * notification perdue ne doit pas bloquer l'action réelle.
 *
 * `dedupeUnread` évite d'empiler les alertes d'un même fil (messagerie) tant
 * que la précédente n'a pas été lue.
 */
export async function createNotification(
  params: NotificationContent & { userId: number; dedupeUnread?: boolean }
): Promise<void> {
  try {
    const link = internalLink(params.link);
    if (params.dedupeUnread) {
      const unread = await prisma.notification.findFirst({
        where: { userId: params.userId, type: params.type, link, readAt: null },
        select: { id: true },
      });
      if (unread) return;
    }
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title.slice(0, 200),
        body: params.body ?? null,
        link,
      },
    });
  } catch (err) {
    console.error(`[notification:${params.type}] création échouée:`, err);
  }
}

async function notifyMany(userIds: number[], content: NotificationContent): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: content.type,
        title: content.title.slice(0, 200),
        body: content.body ?? null,
        link: internalLink(content.link),
      })),
    });
  } catch (err) {
    console.error(`[notification:${content.type}] création échouée:`, err);
  }
}

/**
 * Prévient les admins et les modérateurs titulaires de cette permission :
 * dans l'application, et sur Telegram pour ceux qui l'ont relié, si ce type
 * d'événement y est autorisé (lib/telegram.ts).
 */
export async function notifyStaff(permission: Permission, content: NotificationContent): Promise<void> {
  let staff: { id: number; role: string; permissions: unknown; telegramChatId: string | null }[] = [];
  try {
    staff = (
      await prisma.user.findMany({
        where: { role: { in: ["admin", "moderator"] }, status: "active" },
        select: { id: true, role: true, permissions: true, telegramChatId: true },
      })
    ).filter((u) => hasPermission(u.role, u.permissions, permission));
  } catch (err) {
    console.error(`[notification:${content.type}] destinataires introuvables:`, err);
  }
  // Même sans destinataire en base, TELEGRAM_CHAT_ID (s'il existe) reçoit l'alerte.
  scheduleStaffAlert(content, staff.map((u) => u.telegramChatId));
  await notifyMany(staff.map((u) => u.id), content);
}

/** La publication d'articles n'est pas une permission déléguable : seuls les admins la reçoivent. */
export async function notifyAdmins(content: NotificationContent): Promise<void> {
  let admins: { id: number; telegramChatId: string | null }[] = [];
  try {
    admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { id: true, telegramChatId: true },
    });
  } catch (err) {
    console.error(`[notification:${content.type}] destinataires introuvables:`, err);
  }
  scheduleStaffAlert(content, admins.map((u) => u.telegramChatId));
  await notifyMany(admins.map((u) => u.id), content);
}

/** Le compteur de la cloche ne doit jamais faire tomber la page qui l'affiche. */
export async function unreadNotificationCount(userId: number): Promise<number> {
  try {
    return await prisma.notification.count({ where: { userId, readAt: null } });
  } catch (err) {
    console.error("[notification] comptage échoué:", err);
    return 0;
  }
}
