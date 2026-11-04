import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Inscription thérapeute : jusqu'à 3 documents de 5 Mo dans une seule requête.
    // Le proxy coupe silencieusement le corps à 10 Mo par défaut.
    proxyClientMaxBodySize: "16mb",
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
