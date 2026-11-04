'use client'

import { useEffect, useState } from "react";
import { PlatformBanner } from "./PlatformBanner";

type BannerData = {
  announcementActive: boolean;
  announcementText: string | null;
  maintenanceModeEnabled: boolean;
};

/**
 * Variante de PlatformBanner pour les pages publiques : ces pages peuvent
 * être mises en cache statiquement (voir app/page.tsx, revalidate=60), donc
 * on récupère les réglages côté client via /api/platform-banner pour que
 * l'annonce et le mode maintenance restent à jour sans reconstruire le site.
 */
export function PlatformBannerLive() {
  const [data, setData] = useState<BannerData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/platform-banner")
      .then((res) => (res.ok ? (res.json() as Promise<BannerData>) : null))
      .then((json) => {
        if (active && json) setData(json);
      })
      .catch(() => {
        // Une requête échouée ne doit jamais empêcher la page de s'afficher.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!data) return null;

  return (
    <PlatformBanner
      announcementActive={data.announcementActive}
      announcementText={data.announcementText}
      maintenanceModeEnabled={data.maintenanceModeEnabled}
    />
  );
}
