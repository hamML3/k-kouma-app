'use client'

import Link from "next/link";
import { useEffect, useState } from "react";

const REFRESH_MS = 60_000;

/** Le compteur serveur suit la navigation ; le rafraîchissement couvre les pages laissées ouvertes. */
export function NotificationBellLink({ href, initialCount }: { href: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [lastInitial, setLastInitial] = useState(initialCount);

  if (initialCount !== lastInitial) {
    setLastInitial(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (res.ok) setCount((await res.json()).count);
      } catch {
        // Réseau coupé : on garde le dernier compteur connu.
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label={count > 0 ? `Notifications, ${count} non lue${count > 1 ? "s" : ""}` : "Notifications"}
      className="relative w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kk-border)]"
      style={{ color: "var(--kk-mid)" }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M10 2.5a5 5 0 00-5 5c0 4.2-1.7 5.5-1.7 5.5h13.4S15 11.7 15 7.5a5 5 0 00-5-5z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M8.3 16a1.8 1.8 0 003.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: "#C0392B", color: "#fff" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
