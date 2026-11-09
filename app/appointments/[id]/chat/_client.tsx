'use client'

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { completeAppointmentAction } from "@/lib/actions/appointments";
import { ReportButton } from "@/components/ReportButton";

type Message = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
};

export default function ChatClient({
  appointmentId,
  userId,
  role,
  otherName,
  otherId,
  durationMinutes,
  opensAt,
  endsAt,
  initialMessages,
}: {
  appointmentId: number;
  userId: number;
  role: string;
  otherName: string;
  otherId: number;
  durationMinutes: number;
  opensAt: string;
  endsAt: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  // Une séance par écrit dure une heure comme les autres : l'écriture ouvre
  // 15 minutes avant et se ferme à l'heure de fin (le serveur refuse aussi).
  const [phase, setPhase] = useState<"early" | "open" | "ended">("open");
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setPhase(now < new Date(opensAt).getTime() ? "early" : now >= new Date(endsAt).getTime() ? "ended" : "open");
    };
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [opensAt, endsAt]);
  const [isPendingCompletion, startCompletionTransition] = useTransition();

  const lastAt = useRef<string>(initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString());
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  // Ajoute des messages en évitant les doublons (le flux temps réel et le
  // filet de secours peuvent parfois livrer le même message deux fois).
  const addFresh = useCallback((fresh: Message[]) => {
    if (fresh.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const toAdd = fresh.filter((m) => !known.has(m.id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    const latest = fresh[fresh.length - 1].createdAt;
    if (latest > lastAt.current) lastAt.current = latest;
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${appointmentId}?after=${encodeURIComponent(lastAt.current)}`);
      if (!res.ok) return;
      addFresh((await res.json()) as Message[]);
    } catch {
      // erreur réseau ; nouvel essai au prochain tick
    }
  }, [appointmentId, addFresh]);

  // Flux temps réel (SSE) — messages instantanés dès qu'ils sont envoyés.
  useEffect(() => {
    const source = new EventSource(`/api/messages/${appointmentId}/stream`);
    source.addEventListener("message", (ev) => {
      addFresh([JSON.parse(ev.data) as Message]);
    });
    return () => source.close();
  }, [appointmentId, addFresh]);

  // Filet de secours : un poll espacé, au cas où le flux temps réel serait
  // coupé silencieusement par un proxy intermédiaire.
  useEffect(() => {
    pollingTimer.current = setInterval(poll, 8000);
    return () => {
      if (pollingTimer.current) clearInterval(pollingTimer.current);
    };
  }, [poll]);

  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${appointmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Impossible d'envoyer le message.");
        return;
      }
      const message = (await res.json()) as Message;
      addFresh([message]);
      setDraft("");
    } catch {
      setError("Impossible d'envoyer le message. Vérifiez votre connexion.");
    } finally {
      setSending(false);
    }
  }, [appointmentId, draft, sending, addFresh]);

  const endConversation = () => {
    if (pollingTimer.current) clearInterval(pollingTimer.current);
    const formData = new FormData();
    formData.set("appointmentId", String(appointmentId));
    startCompletionTransition(() => {
      completeAppointmentAction(formData);
    });
    setEnded(true);
  };

  if (ended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: "var(--kk-bg)" }}>
        <div className="text-center">
          <p className="text-4xl mb-4">👋</p>
          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Séance terminée
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
            {isPendingCompletion ? "Finalisation…" : "La conversation est close."}
          </p>
          <Link href="/appointments" className="kk-btn-purple inline-block px-6 py-3 text-sm">
            Retour à mes rendez-vous
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--kk-bg)" }}>
      <ChatTopBar
        otherName={otherName}
        otherId={otherId}
        appointmentId={appointmentId}
        durationMinutes={durationMinutes}
        onEnd={endConversation}
        canEnd={role === "therapist"}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-xl mx-auto space-y-2.5">
          {messages.length === 0 && (
            <p className="text-center text-sm mt-10" style={{ color: "var(--kk-faint)" }}>
              Aucun message pour l&apos;instant. Dites bonjour 👋
            </p>
          )}
          {messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
                  style={{
                    background: mine ? "var(--kk-purple)" : "#fff",
                    color: mine ? "#fff" : "var(--kk-dark)",
                    border: mine ? "none" : "1px solid var(--kk-border)",
                    borderBottomRightRadius: mine ? 4 : undefined,
                    borderBottomLeftRadius: mine ? undefined : 4,
                  }}
                >
                  {m.body}
                  <div
                    className="text-[10px] mt-1 text-right"
                    style={{ color: mine ? "rgba(255,255,255,0.65)" : "var(--kk-faint)" }}
                  >
                    {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 py-4" style={{ background: "#fff", borderTop: "1px solid var(--kk-border)" }}>
        <div className="max-w-xl mx-auto">
          {error && <p className="kk-error mb-2 text-xs">{error}</p>}
          {phase !== "open" ? (
            <p className="text-sm text-center py-2" style={{ color: "var(--kk-muted)" }}>
              {phase === "early"
                ? `La séance commence à ${new Date(new Date(opensAt).getTime() + 15 * 60_000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : vous pourrez écrire 15 minutes avant.`
                : "L'heure de la séance est écoulée. Pour continuer l'échange, utilisez la messagerie (menu « Messages »)."}
            </p>
          ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Écrivez votre message…"
              className="kk-input flex-1 resize-none"
              style={{ maxHeight: 120 }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !draft.trim()}
              className="kk-btn-purple px-5 py-3 shrink-0"
            >
              Envoyer
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatTopBar({
  otherName,
  otherId,
  appointmentId,
  durationMinutes,
  onEnd,
  canEnd,
}: {
  otherName: string;
  otherId: number;
  appointmentId: number;
  durationMinutes: number;
  onEnd: () => void;
  canEnd: boolean;
}) {
  return (
    <div
      className="px-3 py-3 flex items-center justify-between gap-3"
      style={{ background: "#fff", borderBottom: "1px solid var(--kk-border)" }}
    >
      <div className="max-w-xl mx-auto w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/appointments"
            aria-label="Retour à mes rendez-vous"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
            style={{ background: "var(--kk-bg)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="var(--kk-mid)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: "var(--kk-purple)" }}
          >
            {otherName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              {otherName}
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--kk-muted)" }}>
              <Icon name="chat" size={11} />
              Séance de {durationMinutes} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Signalement — accessible à tout moment pendant la conversation, sans la fermer */}
          <ReportButton reportedId={otherId} reportedName={otherName} appointmentId={appointmentId} variant="light" />
          {canEnd ? (
            <button
              type="button"
              onClick={onEnd}
              className="text-xs font-bold px-3.5 py-2 rounded-full shrink-0"
              style={{ background: "#FFF1F0", color: "#C0392B" }}
            >
              Terminer
            </button>
          ) : (
            <span
              className="text-xs font-semibold px-3.5 py-2 rounded-full shrink-0"
              style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
            >
              Séance en cours
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
