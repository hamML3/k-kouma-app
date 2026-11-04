-- AlterTable : permissions accordées à un compte "modérateur" (remplace le
-- jeu de capacités fixe du rôle par un ensemble configurable par compte,
-- voir lib/permissions.ts). NULL pour toute ligne existante — un script de
-- backfill (prisma/backfill-moderator-permissions.ts) accorde explicitement
-- l'ancien jeu de capacités aux modérateurs déjà créés, pour qu'aucun compte
-- existant ne régresse.
ALTER TABLE `users` ADD COLUMN `permissions` JSON NULL;
