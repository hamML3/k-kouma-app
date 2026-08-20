import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { confirmAppointmentAction } from "@/lib/actions/appointments";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

const MOTIF_LABELS: Record<string, string> = {
  anxiete: "Anxiété / stress",
  humeur: "Humeur / tristesse",
  relations: "Relations",
  sommeil: "Sommeil",
  confiance: "Confiance en soi",
  traumatisme: "Traumatisme",
  deuil: "Deuil / perte",
  autre: "Autre",
};

const THERAPY_LABELS: Record<string, string> = {
  individuelle: "Individuelle",
  couple: "Couple",
  enfant: "Enfant / Ado",
};

export const metadata = {
  title: "Mes patients — K-Kouma",
};

export default async function PatientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "therapist") redirect("/dashboard");

  const therapistId = Number(session.user.id);

  const [appointments, therapistProfile] = await Promise.all([
    prisma.appointment.findMany({
      where: { therapistId, status: { in: ["pending", "confirmed"] } },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            patientProfile: {
              select: { nickname: true, onboardingAnswers: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    prisma.therapistProfile.findUnique({
      where: { userId: therapistId },
      select: { firstName: true, isVerified: true },
    }),
  ]);

  // Unique patients from appointments
  const patientMap = new Map<number, typeof appointments[0]["patient"]>();
  appointments.forEach((a) => {
    if (!patientMap.has(a.patient.id)) patientMap.set(a.patient.id, a.patient);
  });
  const patients = Array.from(patientMap.values());

  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledAt) > new Date()
  );

  if (!therapistProfile?.isVerified) {
    return (
      <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
        <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />
        <div className="flex items-center justify-center px-5 py-20">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">⏳</div>
            <h1
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              Compte en attente de vérification
            </h1>
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
              Votre profil est en cours de vérification. Vous aurez accès à vos patients une fois validé.
            </p>
            <Link href="/dashboard" className="kk-btn-outline mt-6 inline-block px-6 py-3 text-sm">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />

      <main className="max-w-4xl mx-auto px-5 py-8">
        <div className="mb-7">
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Mes patients
          </h1>
          <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
            {patients.length} patient{patients.length !== 1 ? "s" : ""} · {upcoming.length} séance{upcoming.length !== 1 ? "s" : ""} à venir
          </p>
        </div>

        {/* Upcoming appointments */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              Prochaines séances
            </h2>
            <div className="space-y-3">
              {upcoming.map((a) => {
                const date = new Date(a.scheduledAt);
                const patientName = a.patient.patientProfile?.nickname ?? a.patient.email;
                const typeIcon = a.type === "video" ? "🎥" : a.type === "audio" ? "🎧" : "💬";

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl p-5 flex items-center gap-4"
                    style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 4px 16px rgba(60,70,55,0.04)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
                      style={{ background: a.status === "confirmed" ? "var(--kk-green-light)" : "var(--kk-gold-light)" }}
                    >
                      {typeIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
                        {patientName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                        {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: a.status === "confirmed" ? "var(--kk-green-light)" : "var(--kk-gold-light)",
                          color: a.status === "confirmed" ? "var(--kk-green)" : "var(--kk-gold)",
                        }}
                      >
                        {a.status === "confirmed" ? "✓ Confirmé" : "En attente"}
                      </span>
                      {a.status === "pending" && (
                        <form action={confirmAppointmentAction}>
                          <input type="hidden" name="appointmentId" value={String(a.id)} />
                          <input type="hidden" name="therapistId" value={String(therapistId)} />
                          <button
                            type="submit"
                            className="text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: "var(--kk-green)", color: "#fff" }}
                          >
                            Confirmer
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/patients/${a.patient.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)" }}
                      >
                        Voir →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Patient list */}
        {patients.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="text-3xl mb-3">👥</p>
            <p className="font-bold mb-1" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
              Aucun patient pour l&apos;instant
            </p>
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>
              Vos patients apparaîtront ici une fois leurs rendez-vous confirmés.
            </p>
          </div>
        ) : (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              Tous les patients
            </h2>
            <div className="space-y-3">
              {patients.map((p) => {
                const answers = p.patientProfile?.onboardingAnswers as Record<string, unknown> | null;
                const motifs = (answers?.motifs as string[] | undefined) ?? [];
                const therapyType = answers?.therapyType as string | undefined;
                const mood = answers?.mood as string | undefined;

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl p-5"
                    style={{ background: "#fff", border: "1px solid var(--kk-border)", boxShadow: "0 4px 16px rgba(60,70,55,0.04)" }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                          style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple)" }}
                        >
                          {(p.patientProfile?.nickname ?? p.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: "var(--kk-dark)" }}>
                            {p.patientProfile?.nickname ?? p.email}
                          </p>
                          {therapyType && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                              {THERAPY_LABELS[therapyType] ?? therapyType}
                              {mood && ` · Humeur ${mood}/5`}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/patients/${p.id}`}
                        className="text-sm font-semibold px-4 py-2 rounded-full shrink-0"
                        style={{ background: "var(--kk-green-light)", color: "var(--kk-green)" }}
                      >
                        Voir le profil →
                      </Link>
                    </div>

                    {motifs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {motifs.map((m) => (
                          <span
                            key={m}
                            className="text-xs px-2.5 py-1 rounded-full font-semibold"
                            style={{ background: "var(--kk-border)", color: "var(--kk-mid)" }}
                          >
                            {MOTIF_LABELS[m] ?? m}
                          </span>
                        ))}
                      </div>
                    )}
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
