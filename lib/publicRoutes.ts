const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/blog",
  "/faq",
  "/a-propos",
  "/contact",
  "/security",
  "/legal",
  "/quiz",
  "/api/auth",
  "/api/therapists",
  "/api/platform-banner",
  "/api/payments/paydunya/webhook",
];

/** "/" ne vaut que pour la page d'accueil, et "/blog" couvre /blog/x mais pas /blogue. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}
