-- AlterTable
ALTER TABLE `users` ADD COLUMN `pending_email` VARCHAR(180) NULL;

-- AlterTable
ALTER TABLE `verification_tokens` MODIFY `type` ENUM('email_verify', 'password_reset', 'email_change') NOT NULL;
