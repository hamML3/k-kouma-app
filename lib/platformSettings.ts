import { prisma } from "@/lib/prisma";

/** Réglages globaux de la plateforme — ligne unique (id=1), créée par la migration initiale. */
export async function getPlatformSettings() {
  return prisma.platformSettings.findUnique({ where: { id: 1 } });
}

/**
 * Vrai si le mode maintenance est actif. Utilisé pour bloquer les nouveaux
 * achats de séances (lib/actions/payments.ts) — ne bloque jamais /admin.
 */
export async function isMaintenanceModeEnabled(): Promise<boolean> {
  const settings = await getPlatformSettings();
  return settings?.maintenanceModeEnabled ?? false;
}
