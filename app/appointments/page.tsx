import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cancelAppointmentAction } from "@/lib/actions/appointments";
import Link from "next/link";
import { ReviewForm } from "@/components/ReviewForm";
import { AppHeader } from "@/components/AppHeader";
import { Icon, type IconName } from "@/components/Icon";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "En attente",  bg: "var(--kk-gold-light)",   color: "var(--kk-gold)" },
  confirmed: { label: "Confirmé",    bg: "var(--kk-green-light)",  color: "var(--kk-green)" },
  canceled:  { label: "Annulé",      bg: "#FFF1F0",                color: "#C0392B" },
  completed: { label: "Terminé",     bg: "var(--kk-border)",       color: "var(--kk-muted)" },
};

const TYPE_ICONS: Record<string, IconName> = {
  video: "video",
  audio: "headphones",
  text:  "chat",
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
      review: { select: { rating: true, status: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  // Une séance de messagerie reste active tant que le psychologue ne l'a pas
  // clôturée — elle n'est jamais "en retard" comme un appel programmé.
  const isActive = (a: (typeof appointments)[number]) =>
    a.status !== "canceled" &&
    a.status !== "completed" &&
    (a.type === "text" || new Date(a.scheduledAt) > new Date());

  const upcoming = appointments.filter(isActive);
  const past = appointments.filter((a) => !isActive(a));

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
          <div>
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
          {!isTherapist && (
            <Link
              href="/therapists"
              className="text-sm font-semibold px-4 py-2.5 rounded-full shrink-0"
              style={{ background: "var(--kk-green)", color: "#fff" }}
            >
              + Nouveau RDV
            </Link>
          )}
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
                // Vidéo/audio : joignable seulement autour de l'horaire (30 min avant → 60 min après).
                // Messagerie : joignable en continu tant que la séance est confirmée et non close.
                const isJoinable =
                  a.status === "confirmed" &&
                  (a.type === "text"
                    ? true
                    : a.webrtcRoomId && msToStart <= 30 * 60 * 1000 && msToStart >= -60 * 60 * 1000);
                const joinHref = a.type === "text" ? `/appointments/${a.id}/chat` : `/appointments/${a.id}/room`;

                const otherName = isTherapist
                  ? (a.patient.patientProfile?.nickname ?? a.patient.email)
                  : (`${a.therapist.therapistProfile?.firstName ?? ""} ${a.therapist.therapistProfile?.lastName ?? ""}`.trim() || a.therapist.email);

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
                    style={{
                      background: "#fff",
                      border: isJoinable ? "2px solid var(--kk-green)" : "1px solid var(--kk-border)",
                      boxShadow: isJoinable ? "0 4px 24px rgba(85,123,83,0.15)" : "0 4px 16px rgba(60,70,55,0.05)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                          <Icon name={TYPE_ICONS[a.type]} size={14} />
                          Séance {a.type === "video" ? "vidéo" : a.type === "audio" ? "audio" : "par messagerie"}
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
                          href={joinHref}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold w-full transition-all"
                          style={{ background: "var(--kk-green)", color: "#fff" }}
                        >
                          {a.type === "text" ? (
                            <Icon name="chat" size={16} className="invert brightness-0" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M3 6h9l3 2v4l-3 2H3V6z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {a.type === "text" ? "Rejoindre la conversation" : "Rejoindre la séance"}
                        </Link>
                      </div>
                    )}

                    {!isTherapist && a.status === "pending" && (
                      <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: "1px solid var(--kk-border)" }}>
                        <form action={cancelAppointmentAction}>
                          <input type="hidden" name="appointmentId" value={String(a.id)} />
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
                  <div key={a.id} className="space-y-1.5">
                    <div
                      className="rounded-xl p-4 flex items-center justify-between gap-3"
                      style={{ background: "#fff", border: "1px solid var(--kk-border)", opacity: 0.75 }}
                    >
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--kk-dark)" }}>
                          <Icon name={TYPE_ICONS[a.type]} size={13} />
                          Avec {otherName}
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
                    {!isTherapist && a.status === "completed" &&
                      (a.review ? (
                        <p className="text-xs px-1" style={{ color: "var(--kk-muted)" }}>
                          Votre avis : {a.review.rating}/5{a.review.status === "pending" ? ", en cours de relecture" : ""}
                        </p>
                      ) : (
                        <ReviewForm appointmentId={a.id} />
                      ))}
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
