import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { AppHeader } from "@/components/AppHeader";
import { ARTICLES, getArticle } from "@/lib/articles";

export function generateStaticParams() {
  // Seuls les slugs éditoriaux (ARTICLES, en mémoire) sont pré-rendus au
  // build. Les slugs d'articles proposés vivent en base et sont rendus à la
  // demande (dynamicParams par défaut) — pas d'appel Prisma ici, pour ne pas
  // dépendre d'une base de données disponible au moment du build.
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

async function getSubmittedArticle(slug: string) {
  return prisma.submittedArticle.findUnique({
    where: { slug, status: "published" },
    include: {
      author: {
        select: { email: true, therapistProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (article) return { title: `${article.title} — K-Kouma` };

  const submitted = await getSubmittedArticle(slug);
  return { title: submitted ? `${submitted.title} — K-Kouma` : "Article — K-Kouma" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);

  const session = await auth();
  const isConnected = Boolean(session?.user);

  if (!article) {
    const submitted = await getSubmittedArticle(slug);
    if (!submitted) notFound();

    const authorName = submitted.author.therapistProfile
      ? `${submitted.author.therapistProfile.firstName} ${submitted.author.therapistProfile.lastName}`
      : submitted.author.email;
    const paragraphs = submitted.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    return (
      <>
        {isConnected ? (
          <AppHeader role={session!.user.role} displayName={session!.user.email ?? "Mon compte"} />
        ) : (
          <PublicNav />
        )}

        <main style={{ background: "var(--kk-bg)" }} className="min-h-screen">
          <article className="max-w-2xl mx-auto px-6 py-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6"
              style={{ color: "var(--kk-muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tous les articles
            </Link>

            {submitted.imageUrl && (
              <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden mb-6">
                {/* URL fournie librement par l'auteur — pas de domaine distant à autoriser dans next.config */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={submitted.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}

            <p className="text-xs font-bold mb-2" style={{ color: "var(--kk-purple-text)" }}>
              Par {authorName}
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold mb-3 leading-snug"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              {submitted.title}
            </h1>
            <p className="text-lg font-semibold mb-6" style={{ color: "var(--kk-mid)", fontFamily: "var(--font-lora)" }}>
              {submitted.excerpt}
            </p>

            <div className="space-y-4 mb-8">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--kk-mid)" }}>
                  {p}
                </p>
              ))}
            </div>

            <div
              className="rounded-2xl p-6 text-center mb-8"
              style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: "var(--kk-dark)" }}>
                Ce que vous vivez mérite d&apos;être entendu.
              </p>
              <Link
                href={isConnected ? "/therapists" : "/register"}
                className="kk-btn-purple inline-block px-6 py-2.5 text-sm"
              >
                Parler à un psychologue →
              </Link>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--kk-faint)" }}>
              <strong>À noter :</strong> les informations présentées ici sont destinées à informer et à sensibiliser.
              Elles ne remplacent pas un avis, un diagnostic ou un accompagnement professionnel.
            </p>

            <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--kk-border)" }}>
              <Link href="/blog" className="kk-card p-4 flex items-center justify-between gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                  Voir tous les articles
                </span>
                <span style={{ color: "var(--kk-green-text)" }}>→</span>
              </Link>
            </div>
          </article>
        </main>

        {!isConnected && <PublicFooter />}
      </>
    );
  }

  const currentIndex = ARTICLES.findIndex((a) => a.slug === slug);
  const next = ARTICLES[(currentIndex + 1) % ARTICLES.length];

  return (
    <>
      {isConnected ? (
        <AppHeader role={session!.user.role} displayName={session!.user.email ?? "Mon compte"} />
      ) : (
        <PublicNav />
      )}

      <main style={{ background: "var(--kk-bg)" }} className="min-h-screen">
        <article className="max-w-2xl mx-auto px-6 py-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6"
            style={{ color: "var(--kk-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tous les articles
          </Link>

          <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden mb-6">
            <Image src={article.image} alt="" fill className="object-cover" priority />
          </div>

          <p className="text-xs font-bold mb-2" style={{ color: "var(--kk-purple-text)" }}>
            {article.number} — Article
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-3 leading-snug"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            {article.title}
          </h1>
          <p className="text-lg font-semibold mb-6" style={{ color: "var(--kk-mid)", fontFamily: "var(--font-lora)" }}>
            {article.hook}
          </p>

          <div className="space-y-4 mb-6">
            {article.intro.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--kk-mid)" }}>
                {p}
              </p>
            ))}
          </div>

          <div className="kk-card p-5 mb-6">
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--kk-dark)" }}>
              {article.symptomsIntro}
            </h2>
            <ul className="space-y-1.5">
              {article.symptoms.map((s) => (
                <li key={s} className="text-sm flex items-start gap-2" style={{ color: "var(--kk-mid)" }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--kk-green)" }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "#fff", border: "1px solid var(--kk-border)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
              Un exemple
            </p>
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--kk-dark)" }}>
              {article.example}
            </p>
            {article.exampleNote && (
              <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--kk-mid)" }}>
                {article.exampleNote}
              </p>
            )}
          </div>

          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: "var(--kk-green-light)", border: "1px solid #C2D9BC" }}
          >
            <p className="text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: "var(--kk-green-text)" }}>
              🌿 À retenir
            </p>
            <p className="text-sm font-bold leading-relaxed mb-1.5" style={{ color: "var(--kk-dark)" }}>
              {article.retenirTitle}
            </p>
            {article.retenirBody.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed mt-1.5" style={{ color: "var(--kk-mid)" }}>
                {p}
              </p>
            ))}
          </div>

          {article.aideBody.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold mb-2" style={{ color: "var(--kk-dark)" }}>
                Quand demander de l&apos;aide ?
              </h2>
              {article.aideBody.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed mt-1.5" style={{ color: "var(--kk-mid)" }}>
                  {p}
                </p>
              ))}
            </div>
          )}

          <div
            className="rounded-2xl p-6 text-center mb-8"
            style={{ background: "var(--kk-purple-light)", border: "1px solid #C8BCEB" }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: "var(--kk-dark)" }}>
              Ce que vous vivez mérite d&apos;être entendu.
            </p>
            <Link
              href={isConnected ? "/therapists" : "/register"}
              className="kk-btn-purple inline-block px-6 py-2.5 text-sm"
            >
              Parler à un psychologue →
            </Link>
          </div>

          <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--kk-faint)" }}>
            <strong>À noter :</strong> les informations présentées ici sont destinées à informer et à sensibiliser.
            Elles ne remplacent pas un avis, un diagnostic ou un accompagnement professionnel. Se reconnaître dans
            certains symptômes ne signifie pas nécessairement présenter un trouble de santé mentale.
          </p>
          <p className="text-xs" style={{ color: "var(--kk-faint)" }}>
            Sources :{" "}
            {article.sources.map((s, i) => (
              <span key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {s.label}
                </a>
                {i < article.sources.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>

          <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--kk-border)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--kk-muted)" }}>
              À lire ensuite
            </p>
            <Link href={`/blog/${next.slug}`} className="kk-card p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-bold" style={{ color: "var(--kk-dark)", fontFamily: "var(--font-lora)" }}>
                {next.title}
              </span>
              <span style={{ color: "var(--kk-green-text)" }}>→</span>
            </Link>
          </div>
        </article>
      </main>

      {!isConnected && <PublicFooter />}
    </>
  );
}
