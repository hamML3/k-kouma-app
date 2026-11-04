-- AlterTable
ALTER TABLE `payments` ADD COLUMN `invoice_number` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_invoice_number_key` ON `payments`(`invoice_number`);

-- AlterTable
ALTER TABLE `platform_settings` ADD COLUMN `invoice_tax_note` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `invoice_counters` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `last_number` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Les paiements déjà encaissés reçoivent leur numéro dans l'ordre chronologique.
UPDATE `payments` p
JOIN (
    SELECT `id`, ROW_NUMBER() OVER (ORDER BY COALESCE(`paid_at`, `created_at`), `id`) AS `n`
    FROM `payments`
    WHERE `status` = 'completed'
) numbered ON numbered.`id` = p.`id`
SET p.`invoice_number` = numbered.`n`;

INSERT INTO `invoice_counters` (`id`, `last_number`)
SELECT 1, COUNT(*) FROM `payments` WHERE `status` = 'completed';
