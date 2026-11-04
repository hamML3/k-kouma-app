'use client'

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16" style={{ background: "var(--kk-bg)" }}>
      <div className="kk-card p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-3" aria-hidden>🌿</p>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}>
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kk-muted)" }}>
          Ce n&apos;est pas de votre faute. Réessayez dans un instant ; si le problème continue, contactez-nous.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button type="button" onClick={() => retry()} className="kk-btn-purple text-sm px-5 py-2.5">
            Réessayer
          </button>
          <Link href="/" className="kk-btn-outline text-sm px-5 py-2.5">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
