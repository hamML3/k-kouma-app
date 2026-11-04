'use client'

// Remplace le layout racine : ni les styles globaux ni les polices ne sont chargés ici.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#F6F2EA", fontFamily: "system-ui, sans-serif", color: "#2C342E" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>K-Kouma est momentanément indisponible</h1>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Réessayez dans un instant.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#557B53", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
