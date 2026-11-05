import { PRACTITIONER_LABELS, PRACTITIONER_TITLES, canChooseCoach } from "@/lib/practitioners";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { getSpecialtyIcon } from "@/lib/icons";
import { splitSpecialties } from "@/lib/specialties";
import { chooseTherapistAction } from "@/lib/actions/assignments";
import { scoreTherapist, matchBadge, type OnboardingAnswers } from "@/lib/matching";

export const metadata = {
  title: "Psychologues — K-Kouma",
};

const SPECIALTIES_FILTER = [
  "Tous",
  "Anxiété",
  "Dépression",
  "Couples",
  "Enfants",
  "Traumatisme",
  "Deuil",
];

const COACH_FILTER = "Coachs";

// Le libellé du filtre ne correspond pas toujours au texte des spécialités.
const SPECIALTY_FILTER_TERMS: Record<string, string> = { Couples: "couple" };

const AVATAR_COLORS = ["#557B53", "#8E7CB8", "#C58A3D", "#4A7C9B", "#B85E7C"];

function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ background: color }}
    >
      {initials.toUpperCase()}
    </div>
  );
}

export default async function TherapistsPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string; chosen?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const selectedFilter = params.specialty ?? "Tous";
  const justChosen = params.chosen === "1";
  const error = params.error;
  const userId = Number(session.user.id);
  const isPatient = session.user.role === "patient";

  // Fetch patient profile + current assignment in parallel
  const [patientRow, currentAssignment, therapists] = await Promise.all([
    isPatient
      ? prisma.patientProfile.findUnique({
          where: { userId },
          select: { onboardingAnswers: true },
        })
      : Promise.resolve(null),
    isPatient
      ? prisma.patientTherapistAssignment.findFirst({
          where: { patientId: userId, status: "active" },
          select: { therapistId: true },
        })
      : Promise.resolve(null),
    prisma.therapistProfile.findMany({
      where: { isVerified: true, user: { status: "active" } },
      include: { user: { select: { id: true, email: true } } },
      take: 100,
    }),
  ]);

  const answers = (patientRow?.onboardingAnswers as OnboardingAnswers | null) ?? null;
  const hasAnswers = Boolean(answers && Object.keys(answers).length > 0);
  const assignedTherapistId = currentAssignment?.therapistId ?? null;

  // Un coach n'est jamais proposé à un patient qui a besoin d'un suivi clinique.
  const eligible = canChooseCoach(answers) ? therapists : therapists.filter((t) => t.practitionerKind !== "coach");
  const hasCoaches = eligible.some((t) => t.practitionerKind === "coach");

  // Score every therapist
  const scored = eligible.map((t) => {
    const match = hasAnswers && answers ? scoreTherapist(answers, t) : null;
    return { t, match };
  });

  // Apply specialty filter
  const afterFilter =
    selectedFilter === "Tous"
      ? scored
      : selectedFilter === COACH_FILTER
        ? scored.filter(({ t }) => t.practitionerKind === "coach")
        : scored.filter(({ t }) =>
            t.specialties?.toLowerCase().includes((SPECIALTY_FILTER_TERMS[selectedFilter] ?? selectedFilter).toLowerCase())
          );

  // Sort: assigned first, then by match score desc, then alphabetically
  afterFilter.sort((a, b) => {
    const aAssigned = a.t.user.id === assignedTherapistId ? 1 : 0;
    const bAssigned = b.t.user.id === assignedTherapistId ? 1 : 0;
    if (bAssigned !== aAssigned) return bAssigned - aAssigned;
    const aScore = a.match?.score ?? 0;
    const bScore = b.match?.score ?? 0;
    if (bScore !== aScore) return bScore - aScore;
    return `${a.t.firstName} ${a.t.lastName}`.localeCompare(`${b.t.firstName} ${b.t.lastName}`);
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-3xl mx-auto px-5 py-8">
        {/* Success banner after choosing */}
        {justChosen && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "var(--kk-green-light)", border: "1px solid #C2D9BC" }}
          >
            <span className="text-xl">✓</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kk-green-text)" }}>
                Votre choix est enregistré !
              </p>
              <p className="text-xs" style={{ color: "var(--kk-mid)" }}>
                Vous pouvez maintenant prendre rendez-vous directement depuis son profil.
              </p>
            </div>
          </div>
        )}

        {error === "slot_taken" && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
          >
            <span className="text-xl">⏰</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kk-gold-text)" }}>
                Ce créneau vient d&apos;être réservé par quelqu&apos;un d&apos;autre.
              </p>
              <p className="text-xs" style={{ color: "#8A6530" }}>
                Choisissez un autre horaire pour votre rendez-vous.
              </p>
            </div>
          </div>
        )}

        {answers?.therapyType === "coaching" && !canChooseCoach(answers) && (
          <div
            className="rounded-2xl p-4 mb-6 text-sm"
            style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}
          >
            D&apos;après vos réponses, un psychologue saura mieux vous accompagner pour le moment. C&apos;est pourquoi nous ne vous proposons pas de coach.
          </div>
        )}

        {error === "coach" && (
          <div className="kk-error mb-6">
            D&apos;après vos réponses au questionnaire, un suivi par un psychologue est plus adapté. Choisissez un psychologue dans la liste.
          </div>
        )}

        {error === "assign" && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
          >
            <span className="text-xl">🧭</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kk-gold-text)" }}>
                Choisissez d’abord un psychologue pour réserver une séance.
              </p>
              <p className="text-xs" style={{ color: "#8A6530" }}>
                Sélectionnez un profil puis confirmez votre choix pour continuer le parcours.
              </p>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-6">
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            {hasCoaches
              ? hasAnswers ? "Psychologues et coachs recommandés" : "Nos psychologues et coachs"
              : hasAnswers ? "Psychologues recommandés" : "Nos psychologues"}
          </h1>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
            {afterFilter.length} professionnel{afterFilter.length !== 1 ? "s" : ""} disponible{afterFilter.length !== 1 ? "s" : ""}
            {hasAnswers && " · Triés par compatibilité avec votre profil"}
          </p>
        </div>

        {/* Onboarding nudge if no answers */}
        {isPatient && !hasAnswers && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-4"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--kk-purple-text)" }}>
                Obtenez des recommandations personnalisées
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6B5B96" }}>
                Répondez au questionnaire pour que nous trouvions le psychologue idéal.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="shrink-0 text-xs font-bold px-4 py-2 rounded-full"
              style={{ background: "var(--kk-purple)", color: "#fff" }}
            >
              Commencer →
            </Link>
          </div>
        )}

        {/* Specialty filters */}
        <div className="flex gap-2 flex-wrap mb-7">
          {(hasCoaches ? [...SPECIALTIES_FILTER, COACH_FILTER] : SPECIALTIES_FILTER).map((s) => {
            const active = selectedFilter === s;
            const icon = getSpecialtyIcon(s);
            return (
              <Link
                key={s}
                href={`/therapists${s === "Tous" ? "" : `?specialty=${encodeURIComponent(s)}`}`}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5"
                style={{
                  background: active ? "var(--kk-green)" : "#fff",
                  color: active ? "#fff" : "var(--kk-mid)",
                  border: active ? "none" : "1.5px solid var(--kk-border-mid)",
                }}
              >
                {icon && <Icon name={icon} size={14} className={active ? "invert brightness-0 opacity-90" : "opacity-70"} />}
                {s}
              </Link>
            );
          })}
        </div>

        {/* Therapist list */}
        {afterFilter.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="text-2xl mb-2">🔍</p>
            <p className="font-bold" style={{ color: "var(--kk-dark)" }}>
              Aucun psychologue trouvé
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
              Essayez un autre filtre ou revenez plus tard.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {afterFilter.map(({ t, match }, i) => {
              const fullName = `${t.firstName} ${t.lastName}`;
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const languages = t.languages ? t.languages.split(",").map((l) => l.trim()) : [];
              const specialtiesList = splitSpecialties(t.specialties);
              const badge = match ? matchBadge(match.pct) : null;
              const isAssigned = t.user.id === assignedTherapistId;

              return (
                <div
                  key={t.id}
                  className="rounded-2xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
                  style={{
                    background: "#fff",
                    border: isAssigned
                      ? "2px solid var(--kk-green)"
                      : "1px solid var(--kk-border)",
                    boxShadow: isAssigned
                      ? "0 6px 24px rgba(85,123,83,0.12)"
                      : "0 6px 24px rgba(60,70,55,0.05)",
                  }}
                >
                  {/* Assigned banner */}
                  {isAssigned && (
                    <div
                      className="text-xs font-bold px-3 py-1 rounded-full inline-block mb-3"
                      style={{ background: "var(--kk-green)", color: "#fff" }}
                    >
                      ★ Votre {PRACTITIONER_LABELS[t.practitionerKind]} actuel
                    </div>
                  )}

                  <div className="flex gap-4">
                    <InitialsAvatar name={fullName} color={color} />

                    <div className="flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p
                            className="font-bold"
                            style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
                          >
                            {fullName}
                          </p>
                          <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--kk-muted)" }}>
                            {PRACTITIONER_TITLES[t.practitionerKind]}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
                          >
                            ✓ Vérifié
                          </span>
                          {badge && (
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ background: badge.bg, color: badge.color }}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {t.bio && (
                        <p
                          className="text-sm mt-2 leading-relaxed line-clamp-2"
                          style={{ color: "var(--kk-mid)" }}
                        >
                          {t.bio}
                        </p>
                      )}

                      {/* Match reasons */}
                      {match && match.reasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--kk-faint)" }}>
                            Pourquoi ce {PRACTITIONER_LABELS[t.practitionerKind]} vous est recommandé
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                          {match.reasons.map((r) => (
                            <span
                              key={r}
                              className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
                            >
                              ✓ {r}
                            </span>
                          ))}
                          </div>
                        </div>
                      )}

                      {/* Specialty + language tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {specialtiesList.slice(0, 2).map((s) => {
                          const icon = getSpecialtyIcon(s);
                          return (
                            <span
                              key={s}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                              style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
                            >
                              {icon && <Icon name={icon} size={12} />}
                              {s}
                            </span>
                          );
                        })}
                        {specialtiesList.length > 2 && (
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
                            title={specialtiesList.slice(2).join(", ")}
                          >
                            +{specialtiesList.length - 2}
                          </span>
                        )}
                        {languages.slice(0, 2).map((l) => (
                          <span
                            key={l}
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      {/* CTAs */}
                      <div className="flex items-center justify-end gap-3 mt-4 flex-wrap">
                        <div className="flex gap-2 shrink-0">
                          <Link
                            href={`/therapists/${t.id}`}
                            className="text-sm font-bold px-4 py-2 rounded-full"
                            style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                          >
                            Voir le profil
                          </Link>

                          {isPatient && !isAssigned && (
                            <form action={chooseTherapistAction}>
                              <input type="hidden" name="therapistId" value={String(t.user.id)} />
                              <button
                                type="submit"
                                className="text-sm font-bold px-4 py-2 rounded-full"
                                style={{ background: "var(--kk-green)", color: "#fff" }}
                              >
                                Choisir →
                              </button>
                            </form>
                          )}

                          {isPatient && isAssigned && (
                            <Link
                              href={`/appointments/new?therapistId=${t.user.id}&therapistProfileId=${t.id}`}
                              className="text-sm font-bold px-4 py-2 rounded-full"
                              style={{ background: "var(--kk-green)", color: "#fff" }}
                            >
                              Réserver →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
