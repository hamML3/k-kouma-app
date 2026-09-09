-- CreateTable
CREATE TABLE `therapist_earnings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `therapist_id` INTEGER NOT NULL,
    `appointment_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'XOF',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `therapist_earnings_appointment_id_key`(`appointment_id`),
    INDEX `therapist_earnings_therapist_id_idx`(`therapist_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `therapist_earnings` ADD CONSTRAINT `therapist_earnings_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_earnings` ADD CONSTRAINT `therapist_earnings_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
