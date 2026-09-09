import Image from "next/image";

/**
 * Voile de chargement plein écran : fond assombri, logo K-Kouma centré et
 * agrandi, entouré d'un anneau qui tourne (le logo lui-même reste fixe).
 * À afficher pendant l'attente d'une action (ex. `pending` d'un formulaire).
 */
export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(44,52,46,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 132, height: 132 }}>
        <div
          className="kk-spin absolute inset-0 rounded-full"
          style={{
            border: "5px solid rgba(255,255,255,0.25)",
            borderTopColor: "#fff",
          }}
        />
        <Image
          src="/brand/icon-color.png"
          alt=""
          width={72}
          height={72}
          className="relative"
          style={{ width: 72, height: 72 }}
          priority
        />
      </div>
    </div>
  );
}
