-- AlterTable
ALTER TABLE `therapist_profiles` ADD COLUMN `practitioner_kind` ENUM('psychologist', 'coach') NOT NULL DEFAULT 'psychologist';
