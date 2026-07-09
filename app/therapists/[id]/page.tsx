import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chooseTherapistAction } from "@/lib/actions/assignments";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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
  const specialtiesList = profile.specialties ? profile.specialties.split(",").map((s) => s.trim()) : [];
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

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {/* Header */}
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
            href="/therapists"
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--kk-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-semibold"
            style={{ color: "var(--kk-mid)" }}
          >
            Mon espace
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
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
                  Psychologue clinicien
                </p>
              </div>
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
              >
                ✓ Vérifié K-Kouman
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {specialtiesList.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)" }}
                >
                  {s}
                </span>
              ))}
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
            {/* Price */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#8A6530" }}>
                Tarif
              </p>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
                {Number(profile.hourlyRate) > 0
                  ? `${Number(profile.hourlyRate).toLocaleString("fr-FR")}`
                  : "—"}
              </p>
              {Number(profile.hourlyRate) > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "#8A6530" }}>XOF / séance (45 min)</p>
              )}
            </div>

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
      </main>
    </div>
  );
}
