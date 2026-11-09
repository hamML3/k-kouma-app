'use client'

import { useCallback, useEffect, useRef, useState } from "react";

type Message = { id: number; senderId: number; body: string; createdAt: string };

/**
 * Fil d'une conversation hors séance (patient ↔ praticien, ou support) :
 * messages en direct par flux SSE, avec une relève périodique de secours si
 * un proxy coupe le flux sans prévenir.
 */
export function ConversationThread({
  conversationId,
  viewerId,
  initialMessages,
  canWrite,
  readOnlyText,
  labelFor,
}: {
  conversationId: number;
  viewerId: number;
  initialMessages: Message[];
  canWrite: boolean;
  readOnlyText?: string;
  /** Nom affiché au-dessus des messages des autres (par expéditeur). */
  labelFor: Record<number, string>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAt = useRef<string>(initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const addFresh = useCallback((fresh: Message[]) => {
    if (fresh.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const toAdd = fresh.filter((m) => !known.has(m.id));
      return toAdd.length === 0 ? prev : [...prev, ...toAdd].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    const latest = fresh[fresh.length - 1].createdAt;
    if (latest > lastAt.current) lastAt.current = latest;
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?after=${encodeURIComponent(lastAt.current)}`);
      if (res.ok) addFresh((await res.json()) as Message[]);
    } catch {
      // réseau indisponible : nouvel essai au prochain passage
    }
  }, [conversationId, addFresh]);

  useEffect(() => {
    const source = new EventSource(`/api/conversations/${conversationId}/stream`);
    // Un message reçu en direct est aussi marqué lu, via la relève qui suit.
    source.addEventListener("message", (ev) => {
      addFresh([JSON.parse(ev.data) as Message]);
      void poll();
    });
    return () => source.close();
  }, [conversationId, addFresh, poll]);

  useEffect(() => {
    const timer = setInterval(poll, 10_000);
    return () => clearInterval(timer);
  }, [poll]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Impossible d'envoyer le message.");
        return;
      }
      addFresh([(await res.json()) as Message]);
      setDraft("");
    } catch {
      setError("Impossible d'envoyer le message. Vérifiez votre connexion.");
    } finally {
      setSending(false);
    }
  }, [conversationId, draft, sending, addFresh]);

  return (
    <div className="kk-card flex flex-col overflow-hidden" style={{ height: "min(70vh, 640px)" }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "var(--kk-bg)" }}>
        {messages.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--kk-muted)" }}>
            Aucun message pour l&apos;instant. Écrivez le premier.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === viewerId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]"
                style={
                  mine
                    ? { background: "var(--kk-purple)", color: "#fff", borderBottomRightRadius: 6 }
                    : { background: "#fff", color: "var(--kk-dark)", border: "1px solid var(--kk-border)", borderBottomLeftRadius: 6 }
                }
              >
                {!mine && labelFor[m.senderId] && (
                  <p className="text-[11px] font-bold mb-0.5" style={{ color: "var(--kk-purple-text)" }}>
                    {labelFor[m.senderId]}
                  </p>
                )}
                {m.body}
                <p className="text-[10px] mt-1 text-right" style={{ color: mine ? "rgba(255,255,255,0.7)" : "var(--kk-faint)" }}>
                  {new Date(m.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3" style={{ background: "#fff", borderTop: "1px solid var(--kk-border)" }}>
        {error && <p className="kk-error mb-2 text-xs">{error}</p>}
        {canWrite ? (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Écrivez votre message…"
              aria-label="Votre message"
              className="kk-input flex-1 resize-none"
              style={{ maxHeight: 140 }}
            />
            <button type="button" onClick={() => void send()} disabled={sending || !draft.trim()} className="kk-btn-purple px-5 py-3 shrink-0">
              Envoyer
            </button>
          </div>
        ) : (
          <p className="text-sm text-center py-2" style={{ color: "var(--kk-muted)" }}>
            {readOnlyText ?? "Cette conversation est en lecture seule."}
          </p>
        )}
      </div>
    </div>
  );
}
