import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { personName } from "@/lib/conversationLabels";

export const metadata = { title: "Messages — K-Kouma" };

type Row = { href: string; title: string; subtitle: string; unread: boolean; when: Date | null };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "patient" && role !== "therapist") redirect(role === "admin" || role === "moderator" ? "/admin/support" : "/dashboard");
  const userId = Number(session.user.id);

  const [conversations, assignments] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ ownerId: userId }, { kind: "care", therapistId: userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, patientProfile: { select: { nickname: true } } } },
        therapist: { select: { id: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.patientTherapistAssignment.findMany({
      where: role === "patient" ? { patientId: userId, status: "active" } : { therapistId: userId, status: "active" },
      include: {
        patient: { select: { id: true, email: true, patientProfile: { select: { nickname: true } } } },
        therapist: { select: { id: true, therapistProfile: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const unread = (c: (typeof conversations)[number]) => {
    const readAt = c.ownerId === userId ? c.ownerReadAt : c.otherReadAt;
    return Boolean(c.lastMessageAt && (!readAt || readAt < c.lastMessageAt));
  };
  const when = (d: Date | null) =>
    d ? d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Aucun message";

  const care: Row[] = [];
  const seen = new Set<string>();
  for (const c of conversations.filter((c) => c.kind === "care")) {
    const other = role === "patient" ? c.therapist : c.owner;
    seen.add(`${c.ownerId}:${c.therapistId}`);
    care.push({ href: `/messages/${c.id}`, title: personName(other), subtitle: when(c.lastMessageAt), unread: unread(c), when: c.lastMessageAt });
  }
  // Suivis actifs sans conversation encore : on propose de l'ouvrir.
  for (const a of assignments) {
    if (seen.has(`${a.patientId}:${a.therapistId}`)) continue;
    care.push({
      href: role === "patient" ? "/messages/praticien" : `/messages/patient/${a.patientId}`,
      title: role === "patient" ? personName(a.therapist) : personName(a.patient),
      subtitle: "Démarrer la conversation",
      unread: false,
      when: null,
    });
  }
  const support = conversations.find((c) => c.kind === "support");

  const item = (r: Row) => (
    <Link
      key={r.href}
      href={r.href}
      className="kk-card p-4 flex items-center justify-between gap-3 transition-all duration-150 hover:-translate-y-0.5"
    >
      <div className="min-w-0">
        <p className="font-bold truncate" style={{ color: "var(--kk-dark)" }}>
          {r.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
          {r.subtitle}
        </p>
      </div>
      {r.unread && (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: "var(--kk-purple)", color: "#fff" }}>
          Nouveau
        </span>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      <AppHeader role={role} displayName={session.user.email ?? "Mon compte"} />
      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Messages
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {role === "patient"
              ? "Écrivez à votre praticien ou à l'équipe K-Kouma à tout moment, en dehors des séances."
              : "Échangez avec vos patients et avec l'équipe K-Kouma en dehors des séances."}
          </p>
        </div>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            {role === "patient" ? "Mon praticien" : "Mes patients"}
          </h2>
          {care.length === 0 ? (
            <div className="kk-card p-5 text-sm" style={{ color: "var(--kk-mid)" }}>
              {role === "patient" ? (
                <>
                  Choisissez d&apos;abord un praticien pour pouvoir lui écrire.{" "}
                  <Link href="/therapists" className="font-semibold underline" style={{ color: "var(--kk-green-text)" }}>
                    Voir les psychologues
                  </Link>
                </>
              ) : (
                "Aucun patient suivi pour l'instant."
              )}
            </div>
          ) : (
            <div className="space-y-2">{care.sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0)).map(item)}</div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
            Support K-Kouma
          </h2>
          {item({
            href: support ? `/messages/${support.id}` : "/messages/support",
            title: "L'équipe K-Kouma",
            subtitle: support?.lastMessageAt ? when(support.lastMessageAt) : "Une question sur le site, un paiement, votre compte ?",
            unread: support ? unread(support) : false,
            when: support?.lastMessageAt ?? null,
          })}
        </section>
      </main>
    </div>
  );
}
