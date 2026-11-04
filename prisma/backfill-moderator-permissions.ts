/**
 * K-Kouma — Backfill des permissions des modérateurs existants
 * Usage : npm run backfill:moderator-permissions
 *
 * À exécuter UNE FOIS sur chaque serveur, juste après avoir appliqué la
 * migration `20261107000000_add_user_permissions` (prisma migrate deploy).
 *
 * Le nouveau système de permissions (lib/permissions.ts) remplace le jeu de
 * capacités fixe des modérateurs ("finances + lecture utilisateurs/
 * thérapeutes") par un ensemble configurable par compte (`User.permissions`).
 * La colonne est ajoutée à NULL pour toutes les lignes existantes — un
 * DEFAULT de colonne ne peut pas rattraper ça pour un tableau JSON comme il
 * le ferait pour une valeur scalaire. Sans ce script, chaque modérateur déjà
 * créé perdrait silencieusement l'accès aux actions financières qu'il avait
 * avant cette migration. On lui accorde donc explicitement l'ancien jeu de
 * capacités (`LEGACY_MODERATOR_PERMISSIONS`), pour qu'aucun compte existant
 * ne régresse. Idempotent : un modérateur dont les permissions ont déjà été
 * configurées (par ce script ou par un admin) n'est pas touché.
 */
import { PrismaClient } from "@prisma/client";
import { LEGACY_MODERATOR_PERMISSIONS } from "../lib/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Backfill des permissions des modérateurs existants...\n");

  const moderators = await prisma.user.findMany({
    where: { role: "moderator" },
    select: { id: true, email: true, permissions: true },
  });

  const toBackfill = moderators.filter((m) => m.permissions == null);

  for (const m of toBackfill) {
    await prisma.user.update({
      where: { id: m.id },
      data: { permissions: LEGACY_MODERATOR_PERMISSIONS },
    });
    console.log(`✅ Permissions historiques (${LEGACY_MODERATOR_PERMISSIONS.join(", ")}) accordées → ${m.email}`);
  }

  console.log(`\n🎉 ${toBackfill.length} modérateur(s) mis à jour sur ${moderators.length} au total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
