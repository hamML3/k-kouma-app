import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ReportButton } from "@/components/ReportButton";

const ANSWER_LABELS: Record<string, Record<string, string>> = {
  therapyType: {
    individuelle: "Thérapie individuelle",
    couple: "Thérapie de couple",
    enfant: "Adolescent / Enfant",
  },
  motifs: {
    anxiete: "Anxiété / stress",
    humeur: "Humeur / tristesse",
    relations: "Relations",
    sommeil: "Sommeil",
    confiance: "Confiance en soi",
    traumatisme: "Traumatisme",
    deuil: "Deuil / perte",
    autre: "Autre",
  },
  duration: {
    moins1mois: "Moins d'un mois",
    "1a3mois": "1 à 3 mois",
    "3a12mois": "3 à 12 mois",
    plus1an: "Plus d'un an",
  },
  previousTherapy: {
    jamais: "Première fois",
    passe: "Oui, dans le passé",
    actuel: "Oui, actuellement",
  },
  safety: {
    non: "Non",
    parfois: "Parfois, pas en ce moment",
    oui: "Oui, en ce moment",
  },
  mode: {
    chat: "Messagerie",
    audio: "Audio",
    video: "Vidéo",
  },
  therapistGender: {
    peuimporte: "Peu importe",
    femme: "Femme",
    homme: "Homme",
  },
};

const MOOD_EMOJIS: Record<string, string> = {
  "1": "😔 Très mal",
  "2": "😕 Pas bien",
  "3": "😐 Moyen",
  "4": "🙂 Bien",
  "5": "😊 Très bien",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const { id } = await params;
  const patientUserId = Number(id);
  if (isNaN(patientUserId)) notFound();

  const therapistId = Number(session.user.id);

  // Verify therapist has an appointment with this patient
  const hasRelation = await prisma.appointment.findFirst({
    where: { therapistId, patientId: patientUserId },
  });
  if (!hasRelation) notFound();

  const patient = await prisma.user.findUnique({
    where: { id: patientUserId },
    select: {
      email: true,
      createdAt: true,
      patientProfile: {
        select: { nickname: true, onboardingAnswers: true, timezone: true },
      },
    },
  });

  if (!patient) notFound();

  const appointments = await prisma.appointment.findMany({
    where: { therapistId, patientId: patientUserId },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });

  const rawAnswers = patient.patientProfile?.onboardingAnswers as Record<string, unknown> | null;
  const answers = rawAnswers
    ? {
        therapyType: rawAnswers.therapyType as string | undefined,
        mood: rawAnswers.mood as string | undefined,
        motifs: Array.isArray(rawAnswers.motifs) ? (rawAnswers.motifs as string[]) : [],
        duration: rawAnswers.duration as string | undefined,
        previousTherapy: rawAnswers.previousTherapy as string | undefined,
        safety: rawAnswers.safety as string | undefined,
        langue: rawAnswers.langue as string | undefined,
        mode: rawAnswers.mode as string | undefined,
        therapistGender: rawAnswers.therapistGender as string | undefined,
      }
    : null;
  const nickname = patient.patientProfile?.nickname ?? patient.email;

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending:   { label: "En attente",  color: "var(--kk-gold)" },
    confirmed: { label: "Confirmé",    color: "var(--kk-green)" },
    canceled:  { label: "Annulé",      color: "#C0392B" },
    completed: { label: "Terminé",     color: "var(--kk-muted)" },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-3xl mx-auto px-5 py-8">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4"
          style={{ color: "var(--kk-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mes patients
        </Link>

        {/* Patient header */}
        <div
          className="rounded-2xl p-6 mb-5 flex items-center gap-4"
          style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 6px 24px rgba(60,70,55,0.05)" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
            style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)", fontFamily: "var(--font-lora)" }}
          >
            {nickname.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              {nickname}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
              Patient depuis le {new Date(patient.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          {/* Signalement — déposable à tout moment, pas seulement pendant une séance */}
          <div className="shrink-0">
            <ReportButton reportedId={patientUserId} reportedName={nickname} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Questionnaire d'admission */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <h2
              className="text-sm font-bold mb-4 uppercase tracking-wide"
              style={{ color: "var(--kk-muted)" }}
            >
              Questionnaire d&apos;admission
            </h2>

            {answers ? (
              <div className="space-y-4">
                {answers.therapyType && (
                  <QRow label="Type de thérapie" value={ANSWER_LABELS.therapyType[answers.therapyType as string] ?? String(answers.therapyType)} />
                )}
                {answers.mood && (
                  <QRow label="Humeur actuelle" value={MOOD_EMOJIS[answers.mood as string] ?? String(answers.mood)} />
                )}
                {answers.motifs.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--kk-muted)" }}>
                      Motifs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {answers.motifs.map((m) => (
                        <span
                          key={m}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)" }}
                        >
                          {ANSWER_LABELS.motifs[m] ?? m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {answers.duration && (
                  <QRow label="Durée des symptômes" value={ANSWER_LABELS.duration[answers.duration as string] ?? String(answers.duration)} />
                )}
                {answers.previousTherapy && (
                  <QRow label="Thérapie antérieure" value={ANSWER_LABELS.previousTherapy[answers.previousTherapy as string] ?? String(answers.previousTherapy)} />
                )}
                {answers.safety && (
                  <QRow
                    label="Sécurité"
                    value={ANSWER_LABELS.safety[answers.safety as string] ?? String(answers.safety)}
                    highlight={answers.safety === "oui"}
                  />
                )}
                {answers.langue && (
                  <QRow label="Langue préférée" value={String(answers.langue)} />
                )}
                {answers.mode && (
                  <QRow label="Format préféré" value={ANSWER_LABELS.mode[answers.mode as string] ?? String(answers.mode)} />
                )}
                {answers.therapistGender && (
                  <QRow label="Préférence genre" value={ANSWER_LABELS.therapistGender[answers.therapistGender as string] ?? String(answers.therapistGender)} />
                )}
              </div>
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: "var(--kk-faint)" }}>
                Ce patient n&apos;a pas encore complété le questionnaire.
              </p>
            )}
          </div>

          {/* Appointment history */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <h2
              className="text-sm font-bold mb-4 uppercase tracking-wide"
              style={{ color: "var(--kk-muted)" }}
            >
              Historique des séances
            </h2>

            {appointments.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--kk-faint)" }}>
                Aucune séance enregistrée.
              </p>
            ) : (
              <div className="space-y-3">
                {appointments.map((a) => {
                  const date = new Date(a.scheduledAt);
                  const s = STATUS_MAP[a.status] ?? STATUS_MAP.completed;
                  const typeIcon = a.type === "video" ? "🎥" : a.type === "audio" ? "🎧" : "💬";

                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 py-3"
                      style={{ borderBottom: "1px solid var(--kk-border)" }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                          {typeIcon} {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                          {a.durationMinutes} min
                        </p>
                      </div>
                      <span className="text-xs font-bold" style={{ color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function QRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold mb-0.5 uppercase tracking-wide" style={{ color: "var(--kk-muted)" }}>
        {label}
      </p>
      <p
        className="text-sm font-semibold"
        style={{ color: highlight ? "#C0392B" : "var(--kk-dark)" }}
      >
        {value}
      </p>
    </div>
  );
}
