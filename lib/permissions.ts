/**
 * Système de permissions des comptes "modérateur" (accès admin restreint).
 *
 * `admin` reste le super-utilisateur : il passe toujours, implicitement,
 * n'importe quelle vérification de permission — il n'est jamais soumis à ce
 * système. `moderator` ne peut agir que sur les capacités qui lui ont été
 * explicitement accordées (User.permissions, colonne JSON), ce qui remplace
 * le jeu de capacités fixe ("finances + lecture") par un ensemble
 * configurable, différent d'un compte modérateur à l'autre.
 *
 * Volontairement limité aux capacités réellement vérifiées par l'app — ne
 * pas ajouter de clé ici sans un `hasPermission(...)` qui la contrôle
 * vraiment quelque part.
 */

export const PERMISSIONS = ["manage_users", "manage_therapists", "manage_finances", "manage_reports", "manage_support"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_users: "Utilisateurs — créer, suspendre, réactiver",
  manage_therapists: "Psychologues — valider, rejeter, suspendre, ajuster la commission",
  manage_finances: "Finances — valider les paiements, marquer les reversements",
  // Contrairement aux autres permissions (qui ne gèrent que la capacité
  // d'agir, la lecture restant ouverte à tout modérateur), celle-ci
  // conditionne aussi la simple consultation de /admin/reports : son contenu
  // (allégations de comportement, parfois des détails de santé) est plus
  // sensible qu'une donnée financière, donc pas ouvert par défaut.
  manage_reports: "Signalements — consulter et traiter les signalements patients/psychologues",
  // Comme les signalements, le contenu des échanges avec le support peut être
  // sensible : la lecture elle-même est réservée à cette permission.
  manage_support: "Support — lire et répondre aux messages des patients et praticiens",
};

/**
 * Jeu de permissions historique d'un modérateur, tel qu'il existait avant ce
 * système configurable (accès aux actions financières ; la lecture des
 * utilisateurs/thérapeutes reste de toute façon ouverte à tout modérateur,
 * indépendamment des permissions — ce n'est donc pas une permission). Utilisé
 * par le seed et par le script de backfill pour qu'aucun compte modérateur
 * existant ne régresse après la migration.
 */
export const LEGACY_MODERATOR_PERMISSIONS: Permission[] = ["manage_finances"];

function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}

/** Normalise une valeur quelconque (colonne JSON, session…) en liste de permissions reconnues. */
export function normalizePermissions(raw: unknown): Permission[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPermission);
}

/**
 * admin : toujours autorisé, implicitement — jamais soumis aux permissions.
 * moderator : autorisé seulement si cette permission précise lui a été accordée.
 * tout autre rôle (patient, thérapeute) : jamais autorisé.
 */
export function hasPermission(
  role: string | null | undefined,
  storedPermissions: unknown,
  permission: Permission
): boolean {
  if (role === "admin") return true;
  if (role !== "moderator") return false;
  return normalizePermissions(storedPermissions).includes(permission);
}

/**
 * Protège les comptes admin/modérateur d'une action engagée par un compte à
 * accès restreint — même titulaire de la permission requise pour l'action
 * elle-même. Sans ce garde-fou, un modérateur ayant par exemple
 * `manage_users` pourrait suspendre le compte d'un admin ou d'un autre
 * modérateur. Un véritable admin peut toujours agir sur n'importe qui.
 */
export function canActOnRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "admin") return true;
  return targetRole !== "admin" && targetRole !== "moderator";
}
