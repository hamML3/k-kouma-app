/** Squelette de chargement partagé par les loading.tsx. */
export function PageSkeleton() {
  return (
    <div className="max-w-5xl w-full mx-auto px-5 py-10 animate-pulse" role="status" aria-label="Chargement">
      <div className="h-8 w-56 rounded-lg mb-3" style={{ background: "var(--kk-border)" }} />
      <div className="h-4 w-80 max-w-full rounded mb-8" style={{ background: "var(--kk-border)" }} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl" style={{ background: "var(--kk-border)" }} />
        ))}
      </div>
    </div>
  );
}
