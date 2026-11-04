import { prisma } from "@/lib/prisma";
import { markAllNotificationsReadAction, openNotificationAction } from "@/lib/actions/notifications";

const LIST_LIMIT = 50;

function formatDate(d: Date): string {
  return d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Commune à l'espace connecté et au back-office : seule la page qui l'entoure change. */
export async function NotificationList({ userId }: { userId: number }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
  });
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Notifications
        </h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-sm font-semibold" style={{ color: "var(--kk-green)" }}>
              Tout marquer comme lu
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="kk-card p-10 text-center">
          <p className="text-3xl mb-3" aria-hidden>
            🔔
          </p>
          <p className="font-semibold" style={{ color: "var(--kk-dark)" }}>
            Aucune notification
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Vos rendez-vous, paiements et messages s&apos;afficheront ici.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {notifications.map((n) => (
            <li key={n.id}>
              <form action={openNotificationAction}>
                <input type="hidden" name="notificationId" value={n.id} />
                <button
                  type="submit"
                  className="kk-card w-full text-left p-4 flex items-start gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
                  style={n.readAt ? undefined : { background: "var(--kk-purple-light)" }}
                >
                  <span
                    aria-hidden
                    className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                    style={{ background: n.readAt ? "transparent" : "var(--kk-purple)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                      {!n.readAt && <span className="sr-only">Non lue : </span>}
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="block text-sm mt-0.5" style={{ color: "var(--kk-mid)" }}>
                        {n.body}
                      </span>
                    )}
                    <span className="block text-xs mt-1" style={{ color: "var(--kk-mid)" }}>
                      {formatDate(n.createdAt)}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
