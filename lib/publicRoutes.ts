const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // Lien de changement d'adresse : peut s'ouvrir sur un autre appareil, sans session.
  "/confirm-email",
  // Désinscription des e-mails promotionnels : lien signé, sans session.
  "/desabonnement",
  "/api/unsubscribe",
  "/blog",
  "/faq",
  "/a-propos",
  "/contact",
  "/security",
  "/legal",
  "/quiz",
  // Images des articles du blog, publiques comme lui.
  "/media/articles",
  "/api/auth",
  "/api/therapists",
  "/api/platform-banner",
  "/api/payments/paydunya/webhook",
  // Notification et retour du paiement Orange Money : l'état est toujours
  // vérifié auprès d'Orange, jamais déduit de la requête.
  "/api/payments/orange-money",
  // Protégée par le secret que Telegram joint à chaque appel.
  "/api/telegram/webhook",
  // Protégée par CRON_SECRET, le cron n'a pas de session.
  "/api/cron",
];

/** "/" ne vaut que pour la page d'accueil, et "/blog" couvre /blog/x mais pas /blogue. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}
