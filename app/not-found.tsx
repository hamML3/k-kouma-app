import Link from "next/link";

export const metadata = { title: "Page introuvable — K-Kouma" };

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16" style={{ background: "var(--kk-bg)" }}>
      <div className="kk-card p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-3" aria-hidden>🧭</p>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Page introuvable
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="kk-btn-purple inline-block text-sm px-5 py-2.5">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
