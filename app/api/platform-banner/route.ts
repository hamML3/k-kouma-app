import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platformSettings";

// Toujours recalculé — jamais mis en cache — pour que la bannière reflète
// immédiatement un changement fait depuis /admin/settings.
export const dynamic = "force-dynamic";

/** Données publiques (annonce + mode maintenance) pour PlatformBannerLive, utilisé sur les pages publiques. */
export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json({
    announcementActive: settings?.announcementActive ?? false,
    announcementText: settings?.announcementText ?? null,
    maintenanceModeEnabled: settings?.maintenanceModeEnabled ?? false,
  });
}
