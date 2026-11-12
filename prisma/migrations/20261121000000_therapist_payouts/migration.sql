-- AlterTable
ALTER TABLE `therapist_profiles` ADD COLUMN `payout_phone` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `therapist_earnings` ADD COLUMN `payout_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `therapist_payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `therapist_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'XOF',
    `phone` VARCHAR(20) NOT NULL,
    `reference` VARCHAR(100) NOT NULL,
    `paid_by_id` INTEGER NULL,
    `payout_request_id` INTEGER NULL,
    `statement_sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `therapist_payouts_reference_key`(`reference`),
    UNIQUE INDEX `therapist_payouts_payout_request_id_key`(`payout_request_id`),
    INDEX `therapist_payouts_therapist_id_created_at_idx`(`therapist_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `therapist_earnings_payout_id_idx` ON `therapist_earnings`(`payout_id`);

-- AddForeignKey
ALTER TABLE `therapist_earnings` ADD CONSTRAINT `therapist_earnings_payout_id_fkey` FOREIGN KEY (`payout_id`) REFERENCES `therapist_payouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_payouts` ADD CONSTRAINT `therapist_payouts_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_payouts` ADD CONSTRAINT `therapist_payouts_paid_by_id_fkey` FOREIGN KEY (`paid_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_payouts` ADD CONSTRAINT `therapist_payouts_payout_request_id_fkey` FOREIGN KEY (`payout_request_id`) REFERENCES `payout_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

