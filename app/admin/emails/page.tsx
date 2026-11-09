import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampaignComposer, type Candidate } from "@/components/CampaignComposer";

export const metadata = { title: "E-mails — Administration K-Kouma" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  sending: { label: "En cours", bg: "var(--kk-gold-light)", color: "var(--kk-gold-text)" },
  sent: { label: "Envoyé", bg: "var(--kk-green-light)", color: "var(--kk-green-text)" },
  failed: { label: "Échec", bg: "#FFF1F0", color: "#9B2C20" },
};

export default async function AdminEmailsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");

  const [users, campaigns, optedOut] = await Promise.all([
    prisma.user.findMany({
      where: { status: "active", role: { in: ["patient", "therapist"] } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        marketingOptOutAt: true,
        patientProfile: { select: { nickname: true } },
        therapistProfile: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.emailCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { createdBy: { select: { email: true } } },
    }),
    prisma.user.count({ where: { marketingOptOutAt: { not: null } } }),
  ]);

  const candidates: Candidate[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role === "therapist" ? "therapist" : "patient",
    name: u.therapistProfile ? `${u.therapistProfile.firstName} ${u.therapistProfile.lastName}` : u.patientProfile?.nickname ?? u.email,
    verified: Boolean(u.emailVerifiedAt),
    optedOut: Boolean(u.marketingOptOutAt),
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          E-mails
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Envoyer une actualité, une offre ou une information aux patients et aux praticiens. {optedOut} personne
          {optedOut > 1 ? "s se sont désinscrites" : " s'est désinscrite"} des promotions.
        </p>
      </div>

      <CampaignComposer candidates={candidates} />

      <h2 className="text-sm font-bold uppercase tracking-widest mt-10 mb-3" style={{ color: "var(--kk-muted)" }}>
        Historique
      </h2>
      {campaigns.length === 0 ? (
        <div className="kk-card p-6 text-sm text-center" style={{ color: "var(--kk-muted)" }}>
          Aucun envoi pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const s = STATUS[c.status];
            return (
              <div key={c.id} className="kk-card p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold" style={{ color: "var(--kk-dark)" }}>
                    {c.subject}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                    {c.category === "promotion" ? "Promotion" : "Information"} ·{" "}
                    {c.createdAt.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · par{" "}
                    {c.createdBy.email}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--kk-mid)" }}>
                    {c.sentCount} envoyé{c.sentCount > 1 ? "s" : ""} sur {c.recipientCount}
                    {c.failedCount > 0 && ` · ${c.failedCount} échec${c.failedCount > 1 ? "s" : ""}`}
                    {c.skippedOptOut > 0 && ` · ${c.skippedOptOut} désinscrit${c.skippedOptOut > 1 ? "s" : ""} écarté${c.skippedOptOut > 1 ? "s" : ""}`}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
