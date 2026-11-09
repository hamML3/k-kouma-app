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
  rejected: { label: "À revoir", bg: "#FFF1F0", color: "#C0392B" },
};

export default async function ProposeArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "therapist" && role !== "moderator" && role !== "admin") redirect("/dashboard");

  const userId = Number(session.user.id);
  const { edit } = await searchParams;

  const [submissions, practitioner] = await Promise.all([
    prisma.submittedArticle.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, status: true, createdAt: true, reviewNote: true },
    }),
    role === "therapist"
      ? prisma.therapistProfile.findUnique({ where: { userId }, select: { isVerified: true } })
      : null,
  ]);
  const canWrite = role !== "therapist" || (practitioner?.isVerified ?? false);

  // Modification d'une proposition non publiée : on ne charge que les siennes.
  const editing = edit
    ? await prisma.submittedArticle.findFirst({
        where: { id: Number(edit) || 0, authorId: userId, status: { not: "published" } },
        select: { id: true, title: true, excerpt: true, body: true, imageUrl: true, status: true, reviewNote: true },
      })
    : null;

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
            {editing ? "Modifier l'article" : isAdmin ? "Publier un article" : "Proposer un article"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            {isAdmin
              ? "Partagez un article avec les patients — publié immédiatement sur le blog."
              : "Partagez un article avec les patients. Chaque proposition est relue par un administrateur avant publication sur le blog."}
          </p>
        </div>

        {!canWrite ? (
          <div
            className="rounded-2xl p-5 text-sm"
            style={{ background: "var(--kk-gold-light)", color: "var(--kk-gold-text)", border: "1px solid #E9C98A" }}
          >
            Vous pourrez proposer des articles dès que votre dossier aura été validé par notre équipe.
          </div>
        ) : (
          <>
            {editing?.status === "rejected" && editing.reviewNote && (
              <div
                className="rounded-2xl p-4 mb-4 text-sm"
                style={{ background: "#FFF1F0", color: "#9B2C20", border: "1px solid #F5C6C0" }}
              >
                <p className="font-bold mb-1">Commentaire de l&apos;équipe</p>
                <p className="whitespace-pre-line">{editing.reviewNote}</p>
              </div>
            )}
            {!isAdmin && (
              <div className="rounded-2xl p-4 mb-4 text-sm" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
                <p className="font-bold mb-1.5" style={{ color: "var(--kk-dark)" }}>Avant d&apos;écrire</p>
                <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--kk-mid)" }}>
                  <li>Aucun cas de patient reconnaissable : le secret professionnel s&apos;applique aussi ici.</li>
                  <li>Informez et rassurez, sans poser de diagnostic ni promettre de résultat.</li>
                  <li>Des paragraphes courts, une ligne vide entre chacun.</li>
                  <li>N&apos;utilisez que des images que vous avez le droit de diffuser.</li>
                </ul>
              </div>
            )}
            <ProposeArticleForm isAdmin={isAdmin} article={editing} />
          </>
        )}

        <p className="text-sm mt-4">
          <Link href="/blog" className="font-semibold" style={{ color: "var(--kk-green-text)" }}>
            Voir les articles publiés sur le blog →
          </Link>
        </p>

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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--kk-dark)" }}>
                        {s.status === "published" ? (
                          <Link href={`/blog/${s.slug}`} className="hover:underline">
                            {s.title}
                          </Link>
                        ) : (
                          s.title
                        )}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kk-faint)" }}>
                        {s.status === "published" ? "Publié" : "Proposé"} le {s.createdAt.toLocaleDateString("fr-FR")}
                      </p>
                      {s.status === "rejected" && s.reviewNote && (
                        <p className="text-xs mt-1.5 whitespace-pre-line" style={{ color: "#9B2C20" }}>
                          {s.reviewNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                      {s.status !== "published" && canWrite && (
                        <Link
                          href={`/articles/proposer?edit=${s.id}`}
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "var(--kk-bg)", color: "var(--kk-purple-text)", border: "1px solid var(--kk-border-mid)" }}
                        >
                          {s.status === "rejected" ? "Corriger et renvoyer" : "Modifier"}
                        </Link>
                      )}
                    </div>
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
