import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { AppHeader } from "@/components/AppHeader";
import { ARTICLES } from "@/lib/articles";

export const metadata = { title: "Blog & Articles — K-Kouma" };

export default async function BlogPage() {
  const session = await auth();
  const isConnected = Boolean(session?.user);

  return (
    <>
      {isConnected ? (
        <AppHeader role={session!.user.role} displayName={session!.user.email ?? "Mon compte"} />
      ) : (
        <PublicNav />
      )}

      <main style={{ background: "var(--kk-bg)" }} className="min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--kk-green)" }}>
            Blog &amp; ressources
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
          >
            Comprendre sa santé mentale
          </h1>
          <p className="text-base leading-relaxed mb-12 max-w-2xl" style={{ color: "var(--kk-mid)" }}>
            Des articles courts et accessibles pour mieux comprendre ce que vous vivez. Ces contenus informent et
            sensibilisent — ils ne remplacent pas un avis, un diagnostic ou un accompagnement professionnel.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="kk-card overflow-hidden flex flex-col transition-all hover:scale-[1.01]"
              >
                <div className="relative w-full h-40 shrink-0">
                  <Image src={a.image} alt="" fill className="object-cover" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--kk-purple)" }}>
                    {a.number}
                  </p>
                  <h2
                    className="font-bold text-base mb-2"
                    style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
                  >
                    {a.title}
                  </h2>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--kk-muted)" }}>
                    {a.hook}
                  </p>
                  <p className="text-xs font-bold mt-4" style={{ color: "var(--kk-green)" }}>
                    Lire l&apos;article →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {!isConnected && <PublicFooter />}
    </>
  );
}
