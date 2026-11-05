import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chooseTherapistAction } from "@/lib/actions/assignments";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getSpecialtyIcon } from "@/lib/icons";
import { splitSpecialties } from "@/lib/specialties";
import { AppHeader } from "@/components/AppHeader";
import { PRACTITIONER_TITLES } from "@/lib/practitioners";

const AVATAR_COLORS = ["#557B53", "#8E7CB8", "#C58A3D", "#4A7C9B", "#B85E7C"];

export default async function TherapistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const profileId = Number(id);
  if (isNaN(profileId)) notFound();

  const profile = await prisma.therapistProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!profile || !profile.isVerified) notFound();

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const parts = fullName.trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : fullName.slice(0, 2);
  const color = AVATAR_COLORS[profileId % AVATAR_COLORS.length];

  const languages = profile.languages ? profile.languages.split(",").map((l) => l.trim()) : [];
  const specialtiesList = splitSpecialties(profile.specialties);
  const isPatient = session.user.role === "patient";
  const currentPatientId = isPatient ? Number(session.user.id) : null;
  const currentAssignment = currentPatientId
    ? await prisma.patientTherapistAssignment.findFirst({
        where: { patientId: currentPatientId, status: "active" },
        select: { therapistId: true },
      })
    : null;
  const isAssignedToThisTherapist = Boolean(
    currentAssignment?.therapistId && currentAssignment.therapistId === profile.user.id
  );

  const [ratingStats, reviews] = await Promise.all([
    prisma.sessionReview.aggregate({
      where: { therapistId: profile.user.id, status: "published" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.sessionReview.findMany({
      where: { therapistId: profile.user.id, status: "published", comment: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
  ]);
  const reviewCount = ratingStats._count._all;

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={session.user.role} displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-3xl mx-auto px-5 py-8">
        <Link
          href="/therapists"
          className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4"
          style={{ color: "var(--kk-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour à la liste
        </Link>

        {/* Profile header */}
        <div
          className="rounded-2xl p-6 mb-5 flex gap-5 items-start"
          style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 6px 24px rgba(60,70,55,0.05)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0"
            style={{ background: color, fontFamily: "var(--font-lora)" }}
          >
            {initials.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap justify-between">
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
                >
                  {fullName}
                </h1>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--kk-muted)" }}>
                  {PRACTITIONER_TITLES[profile.practitionerKind]}
                </p>
              </div>
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                style={{ background: "var(--kk-green-light)", color: "var(--kk-green-text)" }}
              >
                ✓ Vérifié K-Kouma
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {specialtiesList.map((s) => {
                const icon = getSpecialtyIcon(s);
                return (
                  <span
                    key={s}
                    className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                    style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
                  >
                    {icon && <Icon name={icon} size={13} />}
                    {s}
                  </span>
                );
              })}
              {languages.map((l) => (
                <span
                  key={l}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          {profile.practitionerKind === "coach" && (
            <p
              className="text-sm rounded-xl p-3"
              style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}
            >
              Un coach de vie n&apos;est pas un professionnel de santé. Pour un suivi psychologique, choisissez un psychologue.
            </p>
          )}

          {/* Bio */}
          <div
            className="sm:col-span-2 rounded-2xl p-6"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <h2
              className="text-sm font-bold mb-3 uppercase tracking-wide"
              style={{ color: "var(--kk-muted)" }}
            >
              Présentation
            </h2>
            {profile.bio ? (
              <p className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--kk-faint)" }}>
                Ce professionnel n&apos;a pas encore renseigné sa présentation.
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Languages */}
            {languages.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
              >
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--kk-muted)" }}>
                  Langues
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((l) => (
                    <span
                      key={l}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking section */}
        {isPatient && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--kk-dark)" }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div>
                <h2
                  className="text-lg font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-lora)" }}
                >
                  Prendre rendez-vous
                </h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Choisissez un créneau et consultez par vidéo, audio ou messagerie.
                </p>
              </div>
              <Link
                href={`/appointments/new?therapistId=${profile.user.id}&therapistProfileId=${profile.id}`}
                className="shrink-0 px-6 py-3 rounded-xl text-sm font-bold"
                style={{ background: "var(--kk-green)", color: "#fff" }}
              >
                Réserver une séance →
              </Link>
            </div>
          </div>
        )}

        {reviewCount > 0 && (
          <section className="kk-card p-6 mt-5">
            <h2 className="font-bold mb-1" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
              Avis des patients
            </h2>
            <p className="text-sm" style={{ color: "var(--kk-mid)" }}>
              <span aria-hidden style={{ color: "var(--kk-gold-text)" }}>★</span>{" "}
              {(ratingStats._avg.rating ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 sur {reviewCount} avis
            </p>
            {reviews.length > 0 && (
              <ul className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="pt-3" style={{ borderTop: "1px solid var(--kk-border)" }}>
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--kk-mid)" }}>
                      {r.comment}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--kk-muted)" }}>
                      {r.rating}/5, {r.createdAt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
