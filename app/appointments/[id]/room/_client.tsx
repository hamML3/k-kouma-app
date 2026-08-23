'use client'

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { completeAppointmentAction } from "@/lib/actions/appointments";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type ConnectionState = "requesting" | "waiting" | "connecting" | "connected" | "failed" | "ended";

type SignalPayload =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

type SignalRow = {
  payload: SignalPayload;
  createdAt: string;
  fromRole: string;
};

export default function RoomClient({
  roomId,
  role,
  isVideoCall,
  videoEnabled,
  otherName,
  durationMinutes,
  appointmentId,
  userId,
}: {
  roomId: string;
  role: "patient" | "therapist";
  isVideoCall: boolean;
  videoEnabled: boolean;
  otherName: string;
  scheduledAt: string;
  durationMinutes: number;
  appointmentId: number;
  userId: number;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const lastSignalAt = useRef<string>(new Date(0).toISOString());
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connState, setConnState] = useState<ConnectionState>("requesting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(!videoEnabled);
  const [elapsed, setElapsed] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isPendingCompletion, startCompletionTransition] = useTransition();

  // ── Signaling helpers ────────────────────────────────────────────────────
  const sendSignal = useCallback(
    async (payload: SignalPayload) => {
      try {
        await fetch(`/api/webrtc/${roomId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromRole: role, payload }),
        });
      } catch {
        // network error; continue
      }
    },
    [roomId, role]
  );

  const fetchSignals = useCallback(async (): Promise<SignalRow[]> => {
    try {
      const res = await fetch(
        `/api/webrtc/${roomId}/signal?excludeRole=${role}&after=${encodeURIComponent(lastSignalAt.current)}`
      );
      if (!res.ok) return [];
      return res.json() as Promise<SignalRow[]>;
    } catch {
      return [];
    }
  }, [roomId, role]);

  // ── Peer connection factory ──────────────────────────────────────────────
  const makePc = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Send ICE candidates as they are gathered
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendSignal({ type: "candidate", candidate: candidate.toJSON() });
        }
      };

      // Display remote stream
      pc.ontrack = ({ streams }) => {
        if (remoteVideoRef.current && streams[0]) {
          remoteVideoRef.current.srcObject = streams[0];
          setConnState("connected");
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          setConnState((s) => (s === "ended" ? s : "failed"));
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [sendSignal]
  );

  // ── Process incoming signals ─────────────────────────────────────────────
  const processSignals = useCallback(async () => {
    const signals = await fetchSignals();
    if (!signals.length) return;

    lastSignalAt.current = signals[signals.length - 1].createdAt;

    const pc = pcRef.current;
    if (!pc) return;

    for (const { payload } of signals) {
      try {
        if (payload.type === "offer" && payload.sdp) {
          // Therapist (callee) receives offer → sends answer
          if (pc.signalingState === "stable") {
            await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({ type: "answer", sdp: answer.sdp! });
            // `ontrack` peut se déclencher dès `setRemoteDescription`, avant même
            // que ce point du code soit atteint — ne jamais écraser "connected".
            setConnState((s) => (s === "connected" ? s : "connecting"));
          }
        } else if (payload.type === "answer" && payload.sdp) {
          // Patient (caller) receives answer
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
          }
        } else if (payload.type === "candidate" && payload.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      } catch {
        // ignore malformed signals
      }
    }
  }, [fetchSignals, sendSignal]);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function start() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: true,
        });
      } catch {
        if (!cancelled) {
          setMediaError(
            "Impossible d'accéder au microphone / à la caméra. Vérifiez les permissions du navigateur."
          );
          setConnState("failed");
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = makePc(stream);

      if (role === "patient") {
        // Caller: create offer immediately
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal({ type: "offer", sdp: offer.sdp! });
          setConnState("waiting");
        } catch {
          if (!cancelled) setConnState("failed");
          return;
        }
      } else {
        // Callee: wait for offer
        setConnState("waiting");
      }

      // Poll for signals every 1.5 s
      pollingTimer.current = setInterval(processSignals, 1500);
    }

    start();

    return () => {
      cancelled = true;
      if (pollingTimer.current) clearInterval(pollingTimer.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // ── Elapsed timer when connected ─────────────────────────────────────────
  useEffect(() => {
    if (connState !== "connected") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [connState]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCamOff((c) => !c);
  };

  const endCall = () => {
    if (pollingTimer.current) clearInterval(pollingTimer.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());

    const formData = new FormData();
    formData.set("appointmentId", String(appointmentId));
    formData.set("userId", String(userId));
    startCompletionTransition(() => {
      completeAppointmentAction(formData);
    });

    setConnState("ended");
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── End screen ───────────────────────────────────────────────────────────
  if (connState === "ended") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--kk-dark)" }}
      >
        <div className="text-center px-5">
          <div className="text-5xl mb-5">👋</div>
          <h2
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-lora)" }}
          >
            Séance terminée
          </h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
            Durée : {fmt(elapsed)}
          </p>
          {isPendingCompletion && (
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              Finalisation de la séance…
            </p>
          )}
          <Link
            href="/appointments"
            className="inline-block px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: "var(--kk-green)", color: "#fff" }}
          >
            Retour à mes rendez-vous
          </Link>
        </div>
      </div>
    );
  }

  // ── Main room UI ─────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col select-none"
      style={{ background: "#0D1510" }}
    >
      {/* Remote video / waiting state */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video — shown once connected */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: connState === "connected" ? "block" : "none" }}
        />

        {/* Overlay when not yet connected */}
        {connState !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {/* Avatar */}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center font-bold text-4xl"
              style={{
                background: "var(--kk-purple)",
                color: "#fff",
                fontFamily: "var(--font-lora)",
                boxShadow: "0 0 0 8px rgba(142,124,184,0.2)",
              }}
            >
              {otherName.slice(0, 1).toUpperCase()}
            </div>

            <div className="text-center">
              <p
                className="text-xl font-bold text-white mb-1"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                {otherName}
              </p>

              {connState === "requesting" && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Accès à la caméra et au micro…
                </p>
              )}
              {connState === "waiting" && (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--kk-gold)" }}
                  />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    En attente de l&apos;autre participant…
                  </p>
                </div>
              )}
              {connState === "connecting" && (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--kk-green)" }}
                  />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Connexion en cours…
                  </p>
                </div>
              )}
              {connState === "failed" && (
                <p className="text-sm mt-1" style={{ color: "#FF7070" }}>
                  {mediaError ?? "La connexion a échoué. Vérifiez votre réseau et les permissions."}
                </p>
              )}
            </div>

            {connState === "failed" && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Local video — picture-in-picture, bottom-right */}
        <div
          className="absolute bottom-4 right-4 w-36 h-28 rounded-2xl overflow-hidden border"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{
              display: videoEnabled && !isCamOff ? "block" : "none",
              transform: "scaleX(-1)",
            }}
          />
          {(!videoEnabled || isCamOff) && (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "#1A2820" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 3l18 18M10.5 10.5A3 3 0 0015 12v0M9 12a3 3 0 005.5 1.5M3 8h8M17 8l2 1.5v5L17 16H3V8z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Timer badge */}
        {connState === "connected" && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#FF4444", animation: "pulse 2s infinite" }}
            />
            <span className="text-xs font-bold text-white font-mono">{fmt(elapsed)}</span>
          </div>
        )}

        {/* Other name badge when connected */}
        {connState === "connected" && (
          <div
            className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
          >
            <span className="text-xs font-semibold text-white">{otherName}</span>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center justify-center gap-4 px-6 py-5"
        style={{
          background: "rgba(10,16,12,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Mute */}
        <ControlBtn
          active={!isMuted}
          danger={isMuted}
          onClick={toggleMute}
          title={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2l16 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 2a3 3 0 013 3v2M7 7v2a3 3 0 005.5 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M5 9a5 5 0 009.5 2.2M10 15v3M7 18h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="7" y="2" width="6" height="10" rx="3" stroke="white" strokeWidth="1.8" />
              <path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </ControlBtn>

        {/* Camera — only for video calls */}
        {videoEnabled && (
          <ControlBtn
            active={!isCamOff}
            danger={isCamOff}
            onClick={toggleCam}
            title={isCamOff ? "Activer la caméra" : "Désactiver la caméra"}
          >
            {isCamOff ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 2l16 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M3 7h7M15 7l2 2v4l-2 2H3V7zM8 15v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 7h9l3 2v4l-3 2H3V7z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </ControlBtn>
        )}

        {/* End call */}
        <button
          type="button"
          onClick={endCall}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: "#C0392B" }}
          title="Terminer la séance"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path
              d="M4.5 13.5c0-1 .6-2 2-3 1.5-1 3.5-1.5 6.5-1.5s5 .5 6.5 1.5c1.4 1 2 2 2 3l-3 1.5c-.5-1.2-1.5-2-5.5-2s-5 .8-5.5 2L4.5 13.5z"
              fill="white"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ControlBtn({
  children,
  active,
  danger,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  danger: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
      style={{
        background: danger ? "#C0392B" : active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </button>
  );
}
