-- AlterTable
ALTER TABLE `patient_profiles` ADD COLUMN `session_credits` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_id` INTEGER NOT NULL,
    `therapy_type` VARCHAR(20) NOT NULL,
    `sessions_count` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'XOF',
    `provider` VARCHAR(30) NOT NULL DEFAULT 'paydunya',
    `provider_ref` VARCHAR(255) NULL,
    `status` ENUM('pending', 'completed', 'failed', 'canceled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,

    UNIQUE INDEX `payments_provider_ref_key`(`provider_ref`),
    INDEX `payments_patient_id_status_idx`(`patient_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
