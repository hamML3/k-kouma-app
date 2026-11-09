-- AlterTable
ALTER TABLE `users` ADD COLUMN `marketing_opt_out_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `email_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `category` ENUM('promotion', 'information') NOT NULL,
    `button_label` VARCHAR(60) NULL,
    `button_url` VARCHAR(500) NULL,
    `audience` JSON NOT NULL,
    `recipient_count` INTEGER NOT NULL DEFAULT 0,
    `sent_count` INTEGER NOT NULL DEFAULT 0,
    `failed_count` INTEGER NOT NULL DEFAULT 0,
    `skipped_opt_out` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('sending', 'sent', 'failed') NOT NULL DEFAULT 'sending',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    INDEX `email_campaigns_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_campaigns` ADD CONSTRAINT `email_campaigns_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

