import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";
import { scheduleStaffAlert, type StaffAlertFacts } from "@/lib/telegram";
import { publishNotification } from "@/lib/chatBus";

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
    const created = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title.slice(0, 200),
        body: params.body ?? null,
        link,
      },
    });
    announce(created);
  } catch (err) {
    console.error(`[notification:${params.type}] création échouée:`, err);
  }
}

/** Pop-up en direct dans les onglets ouverts du destinataire (components/NotificationToaster.tsx). */
function announce(n: { id: number; userId: number; title: string; body: string | null; link: string | null; createdAt: Date }) {
  try {
    publishNotification(n.userId, { id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString() });
  } catch {
    // le pop-up est un plus : la notification reste dans la cloche
  }
}

async function notifyMany(userIds: number[], content: NotificationContent): Promise<void> {
  if (userIds.length === 0) return;
  try {
    // Une création par destinataire (et non createMany) pour connaître chaque
    // id : il sert au pop-up ; l'équipe ne compte que quelques personnes.
    const created = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: content.type,
            title: content.title.slice(0, 200),
            body: content.body ?? null,
            link: internalLink(content.link),
          },
        })
      )
    );
    created.forEach(announce);
  } catch (err) {
    console.error(`[notification:${content.type}] création échouée:`, err);
  }
}

type StaffMember = { id: number; telegramChatId: string | null };

/** Membres actifs du staff concernés (admins, et modérateurs titulaires de la permission). */
async function staffFor(permission: Permission | "admins"): Promise<StaffMember[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: permission === "admins" ? ["admin"] : ["admin", "moderator"] }, status: "active" },
      select: { id: true, role: true, permissions: true, telegramChatId: true },
    });
    return users
      .filter((u) => permission === "admins" || hasPermission(u.role, u.permissions, permission))
      .map((u) => ({ id: u.id, telegramChatId: u.telegramChatId }));
  } catch (err) {
    console.error("[notification] destinataires introuvables:", err);
    return [];
  }
}

/** Vrai si le bot reçoit les réponses (webhook actif) : les alertes peuvent porter des boutons. */
async function telegramInteractive(): Promise<boolean> {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 1 }, select: { telegramCommandsEnabledAt: true } });
    return Boolean(settings?.telegramCommandsEnabledAt);
  } catch {
    return false;
  }
}

/**
 * Prévient les admins et les modérateurs titulaires de cette permission :
 * dans l'application, et sur Telegram pour ceux qui l'ont relié, si ce type
 * d'événement y est autorisé (lib/telegram.ts). Même sans destinataire en
 * base, TELEGRAM_CHAT_ID (s'il existe) reçoit l'alerte.
 */
export async function notifyStaff(permission: Permission, content: NotificationContent): Promise<void> {
  const staff = await staffFor(permission);
  scheduleStaffAlert(content, staff.map((u) => u.telegramChatId), await telegramInteractive());
  await notifyMany(staff.map((u) => u.id), content);
}

/** La publication d'articles n'est pas une permission déléguable : seuls les admins la reçoivent. */
export async function notifyAdmins(content: NotificationContent): Promise<void> {
  const admins = await staffFor("admins");
  scheduleStaffAlert(content, admins.map((u) => u.telegramChatId), await telegramInteractive());
  await notifyMany(admins.map((u) => u.id), content);
}

/**
 * Alerte Telegram seule, sans notification dans l'application : pour les
 * événements fréquents qui n'appellent pas d'action (ex. une inscription).
 */
export async function alertStaffOnTelegram(permission: Permission, content: NotificationContent): Promise<void> {
  const staff = await staffFor(permission);
  scheduleStaffAlert(content, staff.map((u) => u.telegramChatId), await telegramInteractive());
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
