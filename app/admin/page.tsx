import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [totalPatients, totalTherapists, pendingTherapists, rejectedTherapists] =
    await Promise.all([
      prisma.user.count({ where: { role: "patient" } }),
      prisma.therapistProfile.count({ where: { isVerified: true } }),
      prisma.therapistProfile.count({
        where: { isVerified: false, rejectedAt: null, user: { status: "active" } },
      }),
      prisma.therapistProfile.count({ where: { rejectedAt: { not: null } } }),
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
      {pendingTherapists > 0 && (
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
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
    </>
  );
}
