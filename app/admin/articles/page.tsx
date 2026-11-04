import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { publishArticleAction, rejectArticleAction } from "@/lib/actions/articles";

export const metadata = { title: "Articles — Administration K-Kouma" };

const ROLE_LABEL: Record<string, string> = {
  therapist: "Psychologue",
  moderator: "Modérateur",
  admin: "Admin",
};

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  // Relecture volontairement réservée au véritable admin (voir
  // lib/actions/articles.ts) — un modérateur ne voit pas cette page.
  if (session?.user?.role !== "admin") redirect("/admin");

  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "published" || rawTab === "rejected" ? rawTab : "pending";

  const [pendingCount, publishedCount, rejectedCount, list] = await Promise.all([
    prisma.submittedArticle.count({ where: { status: "pending" } }),
    prisma.submittedArticle.count({ where: { status: "published" } }),
    prisma.submittedArticle.count({ where: { status: "rejected" } }),
    prisma.submittedArticle.findMany({
      where: { status: tab },
      orderBy: { createdAt: tab === "pending" ? "asc" : "desc" },
      include: {
        author: {
          select: {
            email: true,
            role: true,
            therapistProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const TABS = [
    { id: "pending", label: `En attente (${pendingCount})`, color: "var(--kk-gold-text)" },
    { id: "published", label: `Publiés (${publishedCount})`, color: "var(--kk-green-text)" },
    { id: "rejected", label: `Rejetés (${rejectedCount})`, color: "#C0392B" },
  ];

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
            Articles
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--kk-muted)" }}>
            Relisez les propositions des psychologues, modérateurs et admins avant publication
          </p>
        </div>
        <Link href="/articles/proposer" className="kk-btn-outline text-sm px-4 py-2 shrink-0">
          Proposer un article
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/articles?tab=${t.id}`}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150"
            style={{
              background: tab === t.id ? t.color : "#fff",
              color: tab === t.id ? "#fff" : "var(--kk-mid)",
              border: tab === t.id ? "none" : "1.5px solid var(--kk-border-mid)",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "#fff", border: "1px solid var(--kk-border)" }}>
          <p className="text-3xl mb-2" aria-hidden>🍃</p>
          <p className="font-bold" style={{ color: "var(--kk-dark)" }}>Aucun article dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const authorName = a.author.therapistProfile
              ? `${a.author.therapistProfile.firstName} ${a.author.therapistProfile.lastName}`
              : a.author.email;
            const roleLabel = ROLE_LABEL[a.author.role] ?? a.author.role;

            return (
              <div key={a.id} className="kk-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                        {a.title}
                      </p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--kk-purple-light)", color: "var(--kk-purple-text)" }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kk-muted)" }}>
                      Par {authorName} · {a.createdAt.toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--kk-mid)" }}>
                      {a.excerpt}
                    </p>

                    <details className="mt-3">
                      <summary className="text-xs font-bold cursor-pointer" style={{ color: "var(--kk-green-text)" }}>
                        Lire l&apos;article complet
                      </summary>
                      <div className="mt-3 space-y-2 max-w-2xl">
                        {a.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.imageUrl} alt="" className="w-full max-h-64 object-cover rounded-xl mb-2" />
                        )}
                        {a.body.split(/\n\s*\n/).map((p, i) => (
                          <p key={i} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--kk-mid)" }}>
                            {p}
                          </p>
                        ))}
                      </div>
                    </details>
                  </div>

                  {tab === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <form action={publishArticleAction}>
                        <input type="hidden" name="articleId" value={a.id} />
                        <button type="submit" className="kk-btn-green text-sm px-4 py-2">
                          Publier
                        </button>
                      </form>
                      <form action={rejectArticleAction}>
                        <input type="hidden" name="articleId" value={a.id} />
                        <button
                          type="submit"
                          className="text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                          style={{ background: "#FFF1F0", color: "#C0392B" }}
                        >
                          Rejeter
                        </button>
                      </form>
                    </div>
                  )}
                  {tab === "published" && (
                    <Link href={`/blog/${a.slug}`} target="_blank" className="kk-btn-outline text-sm px-4 py-2 shrink-0">
                      Voir sur le blog →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
