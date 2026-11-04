-- AlterTable : nouveaux réglages plateforme/UI — bannière d'annonce, mode
-- maintenance, activation du paiement manuel Orange Money, affichage de la
-- carte "Coach de vie" sur la page d'accueil publique.
ALTER TABLE `platform_settings`
  ADD COLUMN `announcement_text` TEXT NULL,
  ADD COLUMN `announcement_active` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `maintenance_mode_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `orange_money_manual_enabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `show_life_coach_card` BOOLEAN NOT NULL DEFAULT true;
