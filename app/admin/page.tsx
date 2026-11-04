import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const [
    totalPatients,
    totalTherapists,
    pendingTherapists,
    rejectedTherapists,
    recentUsers,
    todaysAppointments,
    pendingManualPaymentsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "patient" } }),
    prisma.therapistProfile.count({ where: { isVerified: true } }),
    prisma.therapistProfile.count({
      where: { isVerified: false, rejectedAt: null, user: { status: "active" } },
    }),
    prisma.therapistProfile.count({ where: { rejectedAt: { not: null } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        patientProfile: { select: { nickname: true } },
        therapistProfile: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: dayStart, lte: dayEnd }, status: { in: ["pending", "confirmed"] } },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        type: true,
        patient: { select: { patientProfile: { select: { nickname: true } } } },
        therapist: { select: { therapistProfile: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.payment.count({ where: { status: "pending", provider: "orange_money_manual" } }),
  ]);

  const STATS = [
    {
      label: "Patients inscrits",
      value: totalPatients,
      color: "var(--kk-green)",
      bg: "var(--kk-green-light)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.5" stroke="#557B53" strokeWidth="1.8" />
          <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#557B53" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Psychologues vérifiés",
      value: totalTherapists,
      color: "var(--kk-purple)",
      bg: "var(--kk-purple-light)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 10l3.5 3.5L15 7" stroke="#8E7CB8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="10" r="8" stroke="#8E7CB8" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      label: "En attente de validation",
      value: pendingTherapists,
      color: "var(--kk-gold)",
      bg: "var(--kk-gold-light)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#C58A3D" strokeWidth="1.8" />
          <path d="M10 6v4l2.5 2.5" stroke="#C58A3D" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      link: "/admin/therapists",
    },
    {
      label: "Candidatures rejetées",
      value: rejectedTherapists,
      color: "#C0392B",
      bg: "#FFF1F0",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="#C0392B" strokeWidth="1.8" />
          <path d="M7 7l6 6M13 7l-6 6" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
        >
          Tableau de bord
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Vue d&apos;ensemble de la plateforme K-Kouma
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="kk-card p-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: stat.bg }}
            >
              {stat.icon}
            </div>
            <p className="text-3xl font-bold" style={{ color: stat.color, fontFamily: "var(--font-lora)" }}>
              {stat.value}
            </p>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--kk-muted)" }}>
              {stat.label}
            </p>
            {stat.link && stat.value > 0 && (
              <Link
                href={stat.link}
                className="text-xs font-bold mt-2 inline-block"
                style={{ color: stat.color }}
              >
                Voir →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div className="space-y-3 mb-10">
        {pendingTherapists > 0 && (
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "var(--kk-gold-light)", border: "1px solid #E9C98A" }}
          >
            <div>
              <p className="font-bold" style={{ color: "var(--kk-gold)" }}>
                {pendingTherapists} candidature{pendingTherapists > 1 ? "s" : ""} en attente de validation
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#8A6530" }}>
                Des psychologues attendent votre vérification pour pouvoir exercer.
              </p>
            </div>
            <Link href="/admin/therapists" className="kk-btn-green shrink-0 text-sm px-5 py-2.5">
              Examiner →
            </Link>
          </div>
        )}

        {pendingManualPaymentsCount > 0 && (
          <div
            className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <div>
              <p className="font-bold" style={{ color: "var(--kk-purple)" }}>
                {pendingManualPaymentsCount} paiement{pendingManualPaymentsCount > 1 ? "s" : ""} Orange Money à vérifier
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#6B5B96" }}>
                Des patients ont déclaré un paiement en attente de confirmation.
              </p>
            </div>
            <Link href="/admin/finances" className="kk-btn-purple shrink-0 text-sm px-5 py-2.5">
              Vérifier →
            </Link>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Today's appointments */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Rendez-vous aujourd&apos;hui ({todaysAppointments.length})
          </h2>
          {todaysAppointments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--kk-muted)" }}>Aucun rendez-vous prévu aujourd&apos;hui.</p>
          ) : (
            <div className="space-y-2">
              {todaysAppointments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>
                      {a.patient.patientProfile?.nickname ?? "Patient"} ↔{" "}
                      {a.therapist.therapistProfile
                        ? `${a.therapist.therapistProfile.firstName} ${a.therapist.therapistProfile.lastName}`
                        : "Psychologue"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      {a.scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.type}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={
                      a.status === "confirmed"
                        ? { background: "var(--kk-green-light)", color: "var(--kk-green)" }
                        : { background: "var(--kk-gold-light)", color: "var(--kk-gold)" }
                    }
                  >
                    {a.status === "confirmed" ? "Confirmé" : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Inscriptions récentes
          </h2>
          <div className="space-y-2">
            {recentUsers.map((u) => {
              const name =
                u.patientProfile?.nickname ??
                (u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : u.email);
              const roleLabel = u.role === "therapist" ? "Psychologue" : u.role === "admin" ? "Admin" : "Patient";
              return (
                <div
                  key={u.id}
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kk-dark)" }}>{name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>{roleLabel}</p>
                  </div>
                  <p className="text-xs shrink-0" style={{ color: "var(--kk-faint)" }}>
                    {u.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
