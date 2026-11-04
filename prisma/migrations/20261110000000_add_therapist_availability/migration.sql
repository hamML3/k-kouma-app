-- AlterTable : fuseau horaire dans lequel le thérapeute saisit ses disponibilités
ALTER TABLE `therapist_profiles` ADD COLUMN `timezone` VARCHAR(50) NOT NULL DEFAULT 'Africa/Bamako';

-- CreateTable : plages de disponibilité hebdomadaires récurrentes (heures
-- "murales" dans le fuseau du thérapeute ; weekday 0 = dimanche … 6 = samedi,
-- start/end en minutes depuis minuit)
CREATE TABLE `therapist_availabilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `therapist_id` INTEGER NOT NULL,
    `weekday` INTEGER NOT NULL,
    `start_minute` INTEGER NOT NULL,
    `end_minute` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `therapist_availabilities_therapist_id_weekday_idx`(`therapist_id`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable : indisponibilités ponctuelles (congés, formation…), bornes en UTC
CREATE TABLE `therapist_unavailabilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `therapist_id` INTEGER NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `reason` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `therapist_unavailabilities_therapist_id_ends_at_idx`(`therapist_id`, `ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `therapist_availabilities` ADD CONSTRAINT `therapist_availabilities_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_unavailabilities` ADD CONSTRAINT `therapist_unavailabilities_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
