import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cancelAppointmentAction } from "@/lib/actions/appointments";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "En attente",  bg: "var(--kk-gold-light)",   color: "var(--kk-gold)" },
  confirmed: { label: "Confirmé",    bg: "var(--kk-green-light)",  color: "var(--kk-green)" },
  canceled:  { label: "Annulé",      bg: "#FFF1F0",                color: "#C0392B" },
  completed: { label: "Terminé",     bg: "var(--kk-border)",       color: "var(--kk-muted)" },
};

const TYPE_ICONS: Record<string, string> = {
  video: "🎥",
  audio: "🎧",
  text:  "💬",
};

export const metadata = {
  title: "Mes rendez-vous — K-Kouma",
};

export default async function PatientAppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = Number(session.user.id);
  const isTherapist = session.user.role === "therapist";

  const appointments = await prisma.appointment.findMany({
    where: isTherapist ? { therapistId: userId } : { patientId: userId },
    include: {
      patient: {
        select: { patientProfile: { select: { nickname: true } }, email: true },
      },
      therapist: {
        select: { therapistProfile: { select: { firstName: true, lastName: true } }, email: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  const upcoming = appointments.filter(
    (a) => a.status !== "canceled" && a.status !== "completed" && new Date(a.scheduledAt) > new Date()
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || a.status === "canceled" || new Date(a.scheduledAt) <= new Date()
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <header
        className="sticky top-0 z-10 px-5 py-4"
        style={{
          background: "rgba(246,242,234,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--kk-border)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            K-Kouma
          </Link>
          <div className="flex items-center gap-4">
            {!isTherapist && (
              <Link
                href="/therapists"
                className="text-sm font-semibold px-4 py-2 rounded-full"
                style={{ background: "var(--kk-green)", color: "#fff" }}
              >
                + Nouveau RDV
              </Link>
            )}
            <Link href="/dashboard" className="text-sm font-semibold" style={{ color: "var(--kk-mid)" }}>
              Mon espace
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="mb-7">
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            {isTherapist ? "Mes séances" : "Mes rendez-vous"}
          </h1>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
            {upcoming.length} à venir · {past.length} passés
          </p>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              À venir
            </h2>
            <div className="space-y-3">
              {upcoming.map((a) => {
                const statusInfo = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending;
                const date = new Date(a.scheduledAt);
                const now = new Date();
                const msToStart = date.getTime() - now.getTime();
                // joinable: from 30 min before until 60 min after scheduled start
                const isJoinable =
                  a.status === "confirmed" &&
                  a.webrtcRoomId &&
                  a.type !== "text" &&
                  msToStart <= 30 * 60 * 1000 &&
                  msToStart >= -60 * 60 * 1000;

                const otherName = isTherapist
                  ? (a.patient.patientProfile?.nickname ?? a.patient.email)
                  : (`${a.therapist.therapistProfile?.firstName ?? ""} ${a.therapist.therapistProfile?.lastName ?? ""}`.trim() || a.therapist.email);

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl p-5"
                    style={{
                      background: "#fff",
                      border: isJoinable ? "2px solid var(--kk-green)" : "1px solid var(--kk-border)",
                      boxShadow: isJoinable ? "0 4px 24px rgba(85,123,83,0.15)" : "0 4px 16px rgba(60,70,55,0.05)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                          {TYPE_ICONS[a.type]} Séance {a.type === "video" ? "vidéo" : a.type === "audio" ? "audio" : "par messagerie"}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: "var(--kk-mid)" }}>
                          Avec {otherName}
                        </p>
                        <p className="text-xs mt-1 font-semibold" style={{ color: "var(--kk-muted)" }}>
                          {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.durationMinutes} min
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Join button — shown when call is imminent */}
                    {isJoinable && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--kk-border)" }}>
                        <Link
                          href={`/appointments/${a.id}/room`}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold w-full transition-all"
                          style={{ background: "var(--kk-green)", color: "#fff" }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3 6h9l3 2v4l-3 2H3V6z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Rejoindre la séance
                        </Link>
                      </div>
                    )}

                    {!isTherapist && a.status === "pending" && (
                      <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: "1px solid var(--kk-border)" }}>
                        <form action={cancelAppointmentAction}>
                          <input type="hidden" name="appointmentId" value={String(a.id)} />
                          <input type="hidden" name="patientId" value={String(userId)} />
                          <button
                            type="submit"
                            className="text-xs font-semibold px-4 py-2 rounded-full"
                            style={{ background: "#FFF1F0", color: "#C0392B", border: "1px solid #FFCAC8" }}
                          >
                            Annuler
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div
            className="rounded-2xl p-10 text-center mb-8"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="text-3xl mb-3">📅</p>
            <p className="font-bold mb-1" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              Aucun rendez-vous à venir
            </p>
            {!isTherapist && (
              <>
                <p className="text-sm mb-5" style={{ color: "var(--kk-muted)" }}>
                  Trouvez votre psychologue et réservez votre première séance.
                </p>
                <Link href="/therapists" className="kk-btn-purple text-sm px-6 py-3">
                  Trouver un psychologue →
                </Link>
              </>
            )}
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              Historique
            </h2>
            <div className="space-y-2">
              {past.map((a) => {
                const statusInfo = STATUS_LABELS[a.status] ?? STATUS_LABELS.completed;
                const date = new Date(a.scheduledAt);
                const otherName = isTherapist
                  ? (a.patient.patientProfile?.nickname ?? a.patient.email)
                  : (`${a.therapist.therapistProfile?.firstName ?? ""} ${a.therapist.therapistProfile?.lastName ?? ""}`.trim() || a.therapist.email);

                return (
                  <div
                    key={a.id}
                    className="rounded-xl p-4 flex items-center justify-between gap-3"
                    style={{ background: "#fff", border: "1px solid var(--kk-border)", opacity: 0.75 }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                        {TYPE_ICONS[a.type]} Avec {otherName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                        {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: statusInfo.bg, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
