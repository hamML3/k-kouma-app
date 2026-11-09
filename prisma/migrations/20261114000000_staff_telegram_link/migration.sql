-- AlterTable
ALTER TABLE `users` ADD COLUMN `telegram_chat_id` VARCHAR(32) NULL,
    ADD COLUMN `telegram_linked_at` DATETIME(3) NULL,
    ADD COLUMN `telegram_link_code` VARCHAR(64) NULL,
    ADD COLUMN `telegram_link_expires_at` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_telegram_link_code_key` ON `users`(`telegram_link_code`);
