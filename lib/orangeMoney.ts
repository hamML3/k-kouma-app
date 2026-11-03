// Pont manuel Orange Money — en attendant un compte marchand API (comme pour
// PayDunya/Resend : tant que ORANGE_MONEY_NUMBER n'est pas dans .env, le
// reste de l'app continue de fonctionner normalement, l'achat de séances par
// ce biais est juste indisponible.

export function orangeMoneyNumber(): string | null {
  return process.env.ORANGE_MONEY_NUMBER?.trim() || null;
}

export function isOrangeMoneyManualEnabled(): boolean {
  return orangeMoneyNumber() !== null;
}
