'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { BodyPortal } from "@/components/BodyPortal";
import { openNotificationAction } from "@/lib/actions/notifications";

type Toast = { id: number; title: string; body: string | null; link: string | null };

const DISMISS_MS = 8_000;
const POLL_MS = 30_000;
const MAX_VISIBLE = 3;

/** Événement écouté par les cloches (NotificationBellLink) pour mettre leur compteur à jour. */
export const NOTIFICATION_EVENT = "kk:notification";

/**
 * Pop-up des nouvelles notifications, à monter une seule fois par page (la
 * cloche, elle, peut apparaître deux fois). Les notifications arrivent en
 * direct par un flux SSE ; une relève toutes les 30 s rattrape celles
 * manquées si le flux a été coupé. Un clic ouvre la notification par
 * openNotificationAction, qui la marque lue et suit son lien.
 */
export function NotificationToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastId = useRef<number | null>(null);
  const seen = useRef(new Set<number>());

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (items: Toast[]) => {
      const fresh = items.filter((n) => !seen.current.has(n.id));
      if (fresh.length === 0) return;
      for (const n of fresh) {
        seen.current.add(n.id);
        if (lastId.current === null || n.id > lastId.current) lastId.current = n.id;
        setTimeout(() => dismiss(n.id), DISMISS_MS);
      }
      setToasts((list) => [...list, ...fresh].slice(-MAX_VISIBLE));
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: { count: fresh.length } }));
    },
    [dismiss]
  );

  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    const poll = async () => {
      if (lastId.current === null || document.hidden) return;
      try {
        const res = await fetch(`/api/notifications/recent?after=${lastId.current}`, { cache: "no-store" });
        if (res.ok) show(((await res.json()) as { items: Toast[] }).items);
      } catch {
        // réseau coupé : nouvel essai au prochain passage
      }
    };

    (async () => {
      // Point de départ : rien de ce qui existait avant l'ouverture de la page ne s'affiche.
      try {
        const res = await fetch("/api/notifications/recent", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        lastId.current = ((await res.json()) as { lastId: number }).lastId;
      } catch {
        return;
      }
      if (cancelled) return;
      source = new EventSource("/api/notifications/stream");
      source.addEventListener("notification", (ev) => show([JSON.parse((ev as MessageEvent).data) as Toast]));
    })();

    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      source?.close();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [show]);

  if (toasts.length === 0) return null;

  return (
    <BodyPortal>
      <div
        className="fixed z-[70] top-3 left-3 right-3 sm:left-auto sm:right-5 sm:top-5 sm:w-96 flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="kk-toast rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 14px 40px rgba(44,52,46,0.18)" }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.5a5 5 0 00-5 5c0 4.2-1.7 5.5-1.7 5.5h13.4S15 11.7 15 7.5a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M8.3 16a1.8 1.8 0 003.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <form action={openNotificationAction} className="flex-1 min-w-0">
              <input type="hidden" name="notificationId" value={t.id} />
              <button type="submit" className="text-left w-full">
                <span className="block text-sm font-bold" style={{ color: "var(--kk-dark)" }}>
                  {t.title}
                </span>
                {t.body && (
                  <span className="block text-xs mt-0.5 line-clamp-3" style={{ color: "var(--kk-mid)" }}>
                    {t.body}
                  </span>
                )}
                {t.link && (
                  <span className="block text-xs font-bold mt-1.5" style={{ color: "var(--kk-purple-text)" }}>
                    Voir →
                  </span>
                )}
              </button>
            </form>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer"
              className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[var(--kk-border)]"
              style={{ color: "var(--kk-muted)" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </BodyPortal>
  );
}
