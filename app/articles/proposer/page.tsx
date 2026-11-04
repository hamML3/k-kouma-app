import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import ProposeArticleForm from "./_client";

export const metadata = { title: "Proposer un article — K-Kouma" };

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "En attente de validation", bg: "var(--kk-gold-light)", color: "var(--kk-gold-text)" },
  published: { label: "Publié", bg: "var(--kk-green-light)", color: "var(--kk-green-text)" },
  rejected: { label: "Rejeté", bg: "#FFF1F0", color: "#C0392B" },
};

export default async function ProposeArticlePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "therapist" && role !== "moderator" && role !== "admin") redirect("/dashboard");

  const userId = Number(session.user.id);

  const submissions = await prisma.submittedArticle.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, createdAt: true },
  });

  const backHref = role === "therapist" ? "/dashboard" : "/admin/articles";
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen" style={{ background: "var(--kk-bg)" }}>
      {role === "therapist" ? (
        <AppHeader role="therapist" displayName={session.user.email ?? "Mon compte"} />
      ) : (
        <header
          className="sticky top-0 z-20 px-5 py-3 flex items-center justify-between"
          style={{ background: "#fff", borderBottom: "1px solid var(--kk-border)" }}
        >
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size={24} />
          </Link>
          <Link href={backHref} className="text-sm font-semibold" style={{ color: "var(--kk-muted)" }}>
            ← Retour
          </Link>
        </header>
      )}

      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            {isAdmin ? "Publier un article" : "Proposer un article"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {isAdmin
              ? "Partagez un article avec les patients — publié immédiatement sur le blog."
              : "Partagez un article avec les patients. Chaque proposition est relue par un administrateur avant publication sur le blog."}
          </p>
        </div>

        <ProposeArticleForm isAdmin={isAdmin} />

        {submissions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-muted)" }}>
              {isAdmin ? "Mes articles" : "Mes propositions"}
            </h2>
            <div className="space-y-2">
              {submissions.map((s) => {
                const status = STATUS_LABEL[s.status];
                return (
                  <div
                    key={s.id}
                    className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
                    style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--kk-dark)" }}>
                        {s.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-faint)" }}>
                        {s.status === "published" ? "Publié" : "Proposé"} le {s.createdAt.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
