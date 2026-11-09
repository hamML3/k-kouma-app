'use client'

import { useState } from "react";

/** Texte à recopier (code, commande), avec un bouton Copier. */
export function CopyText({ value, label = "Copier" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#fff", border: "1px dashed var(--kk-border-mid)" }}>
      <code className="text-sm break-all flex-1" style={{ color: "var(--kk-dark)" }}>
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* presse-papiers indisponible : le texte reste affiché */
          }
        }}
        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: "var(--kk-bg)", color: "var(--kk-purple-text)", border: "1px solid var(--kk-border-mid)" }}
      >
        {copied ? "Copié ✓" : label}
      </button>
    </div>
  );
}
