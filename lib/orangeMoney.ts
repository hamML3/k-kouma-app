// Pont manuel Orange Money — en attendant un compte marchand API (comme pour
// PayDunya/Resend : tant que ORANGE_MONEY_MERCHANT_CODE n'est pas dans .env,
// le reste de l'app continue de fonctionner normalement, l'achat de séances
// par ce biais est juste indisponible.

import { getPlatformSettings } from "@/lib/platformSettings";

export function orangeMoneyMerchantCode(): string | null {
  return process.env.ORANGE_MONEY_MERCHANT_CODE?.trim() || null;
}

/**
 * Vrai si le paiement manuel Orange Money est réellement disponible : code
 * marchand configuré (.env) ET option non désactivée par un admin depuis
 * /admin/settings (PlatformSettings.orangeMoneyManualEnabled) — ce second
 * réglage permet de suspendre l'option sans toucher à la configuration ni
 * redéployer.
 */
export async function isOrangeMoneyManualEnabled(): Promise<boolean> {
  if (orangeMoneyMerchantCode() === null) return false;
  const settings = await getPlatformSettings();
  return settings?.orangeMoneyManualEnabled ?? true;
}
