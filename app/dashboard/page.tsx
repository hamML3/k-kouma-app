import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { ResendVerificationBanner } from "@/components/ResendVerificationBanner";
import { changeTherapistAction } from "@/lib/actions/assignments";
import { recommendedArticles } from "@/lib/articles";
import { effectiveCommissionPercent, needsCommissionAcceptance } from "@/lib/commission";
import { ReportButton } from "@/components/ReportButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = Number(session.user.id);

  const [user, activeAssignment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        emailVerifiedAt: true,
        patientProfile: {
          select: { nickname: true, onboardingAnswers: true, sessionCredits: true },
        },
        therapistProfile: {
          select: {
            firstName: true,
            isVerified: true,
            commissionPercent: true,
            commissionAcceptedPercent: true,
          },
        },
      },
    }),
    prisma.patientTherapistAssignment.findFirst({
      where: { patientId: userId, status: "active" },
      include: {
        therapist: {
          select: {
            therapistProfile: {
              select: { id: true, firstName: true, lastName: true, specialties: true, bio: true },
            },
          },
        },
      },
    }),
  ]);

  const displayName =
    user?.patientProfile?.nickname ??
    user?.therapistProfile?.firstName ??
    session.user.email;

  const isTherapist = user?.role === "therapist";
  const isVerified = user?.therapistProfile?.isVerified ?? false;
  const needsOnboarding =
    !isTherapist && !user?.patientProfile?.onboardingAnswers;

  if (isTherapist && isVerified) {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
    const effective = effectiveCommissionPercent(
      user?.therapistProfile?.commissionPercent ? Number(user.therapistProfile.commissionPercent) : null,
      Number(settings?.defaultCommissionPercent ?? 20)
    );
    const accepted = user?.therapistProfile?.commissionAcceptedPercent
      ? Number(user.therapistProfile.commissionAcceptedPercent)
      : null;
    if (needsCommissionAcceptance(effective, accepted)) redirect("/conditions-commission");
  }

  const assignedTherapist = activeAssignment?.therapist?.therapistProfile ?? null;

  const answers = user?.patientProfile?.onboardingAnswers as { motifs?: string[] } | null;
  const editorialArticles = !isTherapist ? recommendedArticles(answers?.motifs, 3) : [];

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const [nextAppointment, pendingRequests, todaysAppointments, unpaidEarnings, recentSubmittedArticles] = await Promise.all([
    !isTherapist
      ? prisma.appointment.findFirst({
          where: { patientId: userId, status: { in: ["pending", "confirmed"] } },
          orderBy: { scheduledAt: "asc" },
          select: {
            scheduledAt: true,
            status: true,
            type: true,
            therapist: { select: { therapistProfile: { select: { firstName: true, lastName: true } } } },
          },
        })
      : null,
    isTherapist
      ? prisma.appointment.count({ where: { therapistId: userId, status: "pending" } })
      : 0,
    isTherapist
      ? prisma.appointment.findMany({
          where: { therapistId: userId, status: "confirmed", scheduledAt: { gte: dayStart, lte: dayEnd } },
          orderBy: { scheduledAt: "asc" },
          select: {
            id: true,
            scheduledAt: true,
            type: true,
            patient: { select: { patientProfile: { select: { nickname: true } } } },
          },
        })
      : [],
    isTherapist
      ? prisma.therapistEarning.aggregate({ where: { therapistId: userId, paidOut: false }, _sum: { amount: true } })
      : null,
    // Articles proposés (thérapeutes/modérateurs/admins) et validés par un
    // admin — mélangés aux articles éditoriaux ci-dessous, sans logique de
    // correspondance par motif (simples derniers articles publiés).
    !isTherapist
      ? prisma.submittedArticle.findMany({
          where: { status: "published" },
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { slug: true, title: true, excerpt: true, imageUrl: true },
        })
      : [],
  ]);
  const unpaidTotal = Number(unpaidEarnings?._sum.amount ?? 0);

  // Cartes "Articles recommandés" : contenu éditorial figé + derniers
  // articles proposés publiés, unifiés sous une forme commune pour l'affichage.
  const articles: { slug: string; title: string; hook: string; image: string | null }[] = [
    ...editorialArticles.map((a) => ({ slug: a.slug, title: a.title, hook: a.hook, image: a.image as string | null })),
    ...recentSubmittedArticles.map((a) => ({ slug: a.slug, title: a.title, hook: a.excerpt, image: a.imageUrl })),
  ];

  // Message de bienvenue personnalisé, adapté à l'étape du parcours du patient.
  const welcomeMessage = isTherapist
    ? "Bienvenue sur votre espace K-Kouma."
    : needsOnboarding
    ? "Content de vous compter parmi nous. Prenons quelques minutes pour mieux vous connaître."
    : assignedTherapist
    ? "Heureux de vous revoir. Votre psychologue est là pour vous, à votre rythme."
    : "Votre profil est prêt — il ne reste plus qu'à trouver le psychologue qui vous correspond.";

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={user?.role ?? "patient"} displayName={String(displayName)} />

      <main className="max-w-5xl mx-auto px-5 py-10">
        {/* Therapist verification banner */}
        {isTherapist && !isVerified && (
          <div
            className="rounded-2xl p-5 mb-7 flex items-center gap-3"
            style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
          >
            <span className="text-2xl shrink-0" aria-hidden>⏳</span>
            <div>
              <p className="font-bold mb-0.5" style={{ color: "var(--kk-gold-text)" }}>
                Compte en attente de vérification
              </p>
              <p className="text-sm" style={{ color: "#8A6530" }}>
                Notre équipe vérifie votre profil. Vous serez notifié par email dans les 48 heures.
              </p>
            </div>
          </div>
        )}

        {/* Email verification nudge */}
        {!user?.emailVerifiedAt && <ResendVerificationBanner />}

        {/* Onboarding nudge for patients */}
        {needsOnboarding && (
          <div
            className="rounded-2xl p-5 mb-7 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0" aria-hidden>📝</span>
              <div>
                <p className="font-bold mb-0.5" style={{ color: "var(--kk-purple-text)" }}>
                  Complétez votre profil
                </p>
                <p className="text-sm" style={{ color: "#6B5B96" }}>
                  Répondez à quelques questions pour trouver le psychologue idéal.
                </p>
              </div>
            </div>
            <Link href="/onboarding" className="kk-btn-purple shrink-0 text-sm px-5 py-2.5">
              Commencer →
            </Link>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-7">
          <p className="text-sm font-semibold capitalize" style={{ color: "var(--kk-gold-text)" }}>
            {todayLabel}
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-0.5"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Bonjour 👋 {displayName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {welcomeMessage}
          </p>
        </div>

        {/* Therapist: pending requests + today's schedule + payout summary */}
        {isTherapist && isVerified && (
          <>
            {pendingRequests > 0 && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap"
                style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden>🗂️</span>
                  <div>
                    <p className="font-bold" style={{ color: "var(--kk-gold-text)" }}>
                      {pendingRequests} demande{pendingRequests > 1 ? "s" : ""} de rendez-vous en attente
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "#8A6530" }}>
                      Des patients attendent votre confirmation.
                    </p>
                  </div>
                </div>
                <Link href="/patients" className="kk-btn-green shrink-0 text-sm px-5 py-2.5">
                  Examiner →
                </Link>
              </div>
            )}

            <div className="rounded-2xl p-5 mb-6" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--kk-muted)" }}>
                  Aujourd&apos;hui ({todaysAppointments.length})
                </p>
                {unpaidTotal > 0 && (
                  <p className="text-xs font-bold" style={{ color: "var(--kk-gold-text)" }}>
                    {unpaidTotal.toLocaleString("fr-FR")} XOF à reverser
                  </p>
                )}
              </div>
              {todaysAppointments.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun rendez-vous confirmé aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-2">
                  {todaysAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                      <p className="text-sm" style={{ color: "var(--kk-dark)" }}>
                        {a.patient.patientProfile?.nickname ?? "Patient"}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: "var(--kk-muted)" }}>
                        {a.scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Next appointment */}
        {!isTherapist && nextAppointment && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0" aria-hidden>
                {nextAppointment.type === "video" ? "🎥" : nextAppointment.type === "audio" ? "🎧" : "💬"}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-purple-text)" }}>
                  {nextAppointment.status === "confirmed" ? "Prochain rendez-vous" : "En attente de confirmation"}
                </p>
                <p className="font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                  {nextAppointment.scheduledAt.toLocaleString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kk-mid)" }}>
                  Avec{" "}
                  {nextAppointment.therapist.therapistProfile
                    ? `${nextAppointment.therapist.therapistProfile.firstName} ${nextAppointment.therapist.therapistProfile.lastName}`
                    : "votre psychologue"}{" "}
                  · {nextAppointment.type}
                </p>
              </div>
            </div>
            <Link href="/appointments" className="kk-btn-purple shrink-0 text-sm px-5 py-2.5">
              Voir →
            </Link>
          </div>
        )}

        {/* Assigned therapist card */}
        {!isTherapist && assignedTherapist && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: "#fff",
              border: "2px solid var(--kk-green)",
              boxShadow: "0 6px 24px rgba(85,123,83,0.1)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: "var(--kk-green)" }}
              >
                {assignedTherapist.firstName?.[0]}{assignedTherapist.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--kk-green-text)" }}>
                  Votre psychologue
                </p>
                <p className="font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                  {assignedTherapist.firstName} {assignedTherapist.lastName}
                </p>
                {assignedTherapist.specialties && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                    {assignedTherapist.specialties.split(",")[0].trim()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Link
                  href={`/therapists/${assignedTherapist.id}`}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                >
                  Profil
                </Link>
                {/* Signalement — déposable à tout moment, pas seulement pendant une séance */}
                <ReportButton
                  reportedId={activeAssignment!.therapistId}
                  reportedName={`${assignedTherapist.firstName} ${assignedTherapist.lastName}`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid var(--kk-border)" }}>
              <Link
                href={`/appointments/new?therapistId=${activeAssignment?.therapistId}&therapistProfileId=${assignedTherapist.id}`}
                className="flex-1 text-center text-sm font-bold py-2.5 rounded-xl"
                style={{ background: "var(--kk-green)", color: "#fff" }}
              >
                Réserver une séance
              </Link>
              <form action={changeTherapistAction}>
                <button
                  type="submit"
                  className="text-sm font-semibold px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--kk-border)", color: "var(--kk-muted)" }}
                >
                  Changer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Dashboard cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!isTherapist && (
            <>
              <DashboardCard
                href="/therapists"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="8" r="4" stroke="#557B53" strokeWidth="1.8" />
                    <path d="M4 19c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                iconBg="var(--kk-green-light)"
                title="Trouver un psychologue"
                desc="Parcourez les profils et choisissez votre thérapeute"
              />
              <DashboardCard
                href="/appointments"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="5" width="16" height="14" rx="3" stroke="#8E7CB8" strokeWidth="1.8" />
                    <path d="M3 9h16M8 3v4M14 3v4" stroke="#8E7CB8" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                iconBg="var(--kk-purple-light)"
                title="Mes rendez-vous"
                desc="Consultez et gérez vos séances"
              />
              <DashboardCard
                href="/subscription"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="7" width="16" height="10" rx="2.5" stroke="#C58A3D" strokeWidth="1.8" />
                    <path d="M3 11h16" stroke="#C58A3D" strokeWidth="1.8" />
                  </svg>
                }
                iconBg="var(--kk-gold-light)"
                title="Mes séances"
                desc={
                  user?.patientProfile?.sessionCredits
                    ? `${user.patientProfile.sessionCredits} séance${user.patientProfile.sessionCredits > 1 ? "s" : ""} disponible${user.patientProfile.sessionCredits > 1 ? "s" : ""}`
                    : "Achetez des séances pour réserver"
                }
              />
              <DashboardCard
                href="/quiz"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M8 8a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1-1.5 2.2" stroke="#4A7C9B" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="11" cy="16.5" r="1" fill="#4A7C9B" />
                  </svg>
                }
                iconBg="#E0EEF7"
                title="Quiz bien-être"
                desc="Mieux comprendre ce que vous ressentez"
              />
            </>
          )}
          {isTherapist && isVerified && (
            <>
              <DashboardCard
                href="/appointments"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="5" width="16" height="14" rx="3" stroke="#557B53" strokeWidth="1.8" />
                    <path d="M3 9h16M8 3v4M14 3v4" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                iconBg="var(--kk-green-light)"
                title="Mes séances"
                desc={
                  todaysAppointments.length > 0
                    ? `${todaysAppointments.length} aujourd'hui`
                    : "Consultez votre planning"
                }
              />
              <DashboardCard
                href="/profile"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="8" r="4" stroke="#8E7CB8" strokeWidth="1.8" />
                    <path d="M4 19c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#8E7CB8" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                iconBg="var(--kk-purple-light)"
                title="Mon profil"
                desc="Mettez à jour vos informations"
              />
              <DashboardCard
                href="/disponibilites"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="5" width="16" height="14" rx="3" stroke="#4A7C9B" strokeWidth="1.8" />
                    <path d="M3 9h16M8 3v4M14 3v4M8 14l2 2 4-4" stroke="#4A7C9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                iconBg="#E0EEF7"
                title="Mes disponibilités"
                desc="Indiquez quand vos patients peuvent réserver"
              />
              <DashboardCard
                href="/patients"
                icon={
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11h14M11 4v14" stroke="#C58A3D" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                iconBg="var(--kk-gold-light)"
                title="Mes patients"
                desc="Accédez au suivi de vos patients"
              />
            </>
          )}
        </div>

        {/* Articles recommandés */}
        {!isTherapist && articles.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                Articles recommandés pour vous
              </h2>
              <Link href="/blog" className="text-xs font-bold" style={{ color: "var(--kk-green-text)" }}>
                Tout le blog →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="rounded-2xl overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 6px 20px rgba(60,70,55,0.05)" }}
                >
                  <div className="relative w-full h-28 shrink-0" style={{ background: "var(--kk-purple-light)" }}>
                    {a.image ? (
                      a.image.startsWith("/") ? (
                        <Image src={a.image} alt="" fill className="object-cover" />
                      ) : (
                        // URL externe fournie par l'auteur (article proposé) — pas de domaine distant
                        // autorisé dans next.config, donc <img> plutôt que next/image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl" aria-hidden>
                        🌿
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm mb-1" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                      {a.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--kk-muted)" }}>
                      {a.hook}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardCard({
  href,
  icon,
  iconBg,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      className="block p-5 rounded-2xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(60,70,55,0.1)]"
      style={{
        background: "#fff",
        border: "1px solid var(--kk-border)",
        boxShadow: "0 6px 20px rgba(60,70,55,0.05)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <h3
        className="font-bold text-sm mb-1"
        style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}
      >
        {title}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--kk-muted)" }}>
        {desc}
      </p>
    </a>
  );
}
