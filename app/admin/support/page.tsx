import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { personName } from "@/lib/conversationLabels";

export const metadata = { title: "Support — Administration K-Kouma" };

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, session.user.permissions, "manage_support")) redirect("/admin");

  const conversations = await prisma.conversation.findMany({
    where: { kind: "support", lastMessageAt: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      owner: {
        select: { id: true, email: true, role: true, patientProfile: { select: { nickname: true } }, therapistProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  const unread = (c: (typeof conversations)[number]) => Boolean(c.lastMessageAt && (!c.otherReadAt || c.otherReadAt < c.lastMessageAt));
  const sorted = [...conversations].sort((a, b) => Number(unread(b)) - Number(unread(a)));
  const waiting = conversations.filter(unread).length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Support
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
          Messages des patients et praticiens à l&apos;équipe K-Kouma
          {waiting > 0 ? ` · ${waiting} en attente de réponse` : ""}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="kk-card p-10 text-center text-sm" style={{ color: "var(--kk-muted)" }}>
          Aucun message pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => (
            <Link key={c.id} href={`/admin/support/${c.id}`} className="kk-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold truncate" style={{ color: "var(--kk-dark)" }}>
                  {personName(c.owner)}{" "}
                  <span className="text-xs font-semibold" style={{ color: "var(--kk-purple-text)" }}>
                    {c.owner.role === "therapist" ? "Praticien" : "Patient"}
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                  Dernier message le{" "}
                  {c.lastMessageAt!.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {unread(c) && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)" }}>
                  À répondre
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
