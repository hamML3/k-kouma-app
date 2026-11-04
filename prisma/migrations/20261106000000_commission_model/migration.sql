-- AlterTable : nouveau rôle admin restreint (finances + lecture utilisateurs)
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('patient', 'therapist', 'admin', 'moderator') NOT NULL DEFAULT 'patient';

-- AlterTable : fin des tarifs par thérapeute, remplacés par une commission sur le tarif catalogue
ALTER TABLE `therapist_profiles`
  DROP COLUMN `hourly_rate`,
  ADD COLUMN `commission_percent` DECIMAL(5, 2) NULL,
  ADD COLUMN `commission_accepted_percent` DECIMAL(5, 2) NULL,
  ADD COLUMN `commission_accepted_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `platform_settings` (
    `id` INTEGER NOT NULL,
    `default_commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ligne unique de réglages, créée une fois pour toutes
INSERT INTO `platform_settings` (`id`, `default_commission_percent`, `updated_at`) VALUES (1, 20.00, CURRENT_TIMESTAMP(3));

-- AlterTable : traçabilité du prix réel payé, pour un calcul de commission au prorata
ALTER TABLE `payments` ADD COLUMN `sessions_remaining` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `funded_by_payment_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `therapist_earnings` ADD COLUMN `commission_percent` DECIMAL(5, 2) NULL;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_funded_by_payment_id_fkey` FOREIGN KEY (`funded_by_payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
