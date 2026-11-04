import type { NextConfig } from "next";

const BLOCKING_CSP = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'";

// Politique complète en observation seulement : à passer dans BLOCKING_CSP une
// fois vérifié sur le serveur de test qu'elle ne remonte aucune violation
// (appels vidéo et paiement PayDunya compris), voir docs/exploitation.md.
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sentry.io",
  "media-src 'self' blob: mediastream:",
  "form-action 'self' https://app.paydunya.com https://paydunya.com",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    // Inscription thérapeute : jusqu'à 3 documents de 5 Mo dans une seule requête.
    // Le proxy coupe silencieusement le corps à 10 Mo par défaut.
    proxyClientMaxBodySize: "16mb",
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: BLOCKING_CSP },
          { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
