// Paiement manuel Orange Money, en attendant l'accès à une API de paiement :
// le patient paie le code marchand K-Kouma depuis son téléphone, déclare la
// référence reçue par SMS, et l'équipe valide après avoir vérifié l'opération
// dans l'historique du compte marchand (lib/actions/payments.ts et
// /admin/finances).
//
// Le code marchand se saisit dans /admin/settings. La variable
// ORANGE_MONEY_MERCHANT_CODE du .env reste lue en repli, pour les serveurs
// déjà configurés ainsi.

import { getPlatformSettings } from "@/lib/platformSettings";

/** Au-delà, le patient doit attendre qu'une déclaration soit traitée avant d'en faire une autre. */
export const MAX_PENDING_MANUAL_PAYMENTS = 3;

export type OrangeMoneyConfig = {
  /** Code marchand à payer, ou null s'il n'est configuré nulle part. */
  merchantCode: string | null;
  /** Nom du compte marchand tel qu'Orange Money l'affiche, si renseigné. */
  merchantName: string | null;
  /** Interrupteur de /admin/settings, indépendant du code. */
  switchedOn: boolean;
  /** Vrai seulement si les patients peuvent réellement payer par ce biais. */
  enabled: boolean;
};

/** Accepte les chiffres, espaces compris ("12 34 56"), et les renvoie sans espaces. */
export function normalizeMerchantCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").replace(/\s+/g, "");
  return /^[0-9]{4,20}$/.test(code) ? code : null;
}

export async function getOrangeMoneyConfig(): Promise<OrangeMoneyConfig> {
  const settings = await getPlatformSettings();
  const merchantCode =
    normalizeMerchantCode(settings?.orangeMoneyMerchantCode) ??
    normalizeMerchantCode(process.env.ORANGE_MONEY_MERCHANT_CODE);
  const merchantName = settings?.orangeMoneyMerchantName?.trim() || null;
  const switchedOn = settings?.orangeMoneyManualEnabled ?? true;
  return { merchantCode, merchantName, switchedOn, enabled: switchedOn && merchantCode !== null };
}

/** Vrai si le paiement manuel est proposé aux patients : code marchand connu et option active. */
export async function isOrangeMoneyManualEnabled(): Promise<boolean> {
  return (await getOrangeMoneyConfig()).enabled;
}
