-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `proposed_by` VARCHAR(10) NOT NULL DEFAULT 'patient';
