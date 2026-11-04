-- CreateTable
CREATE TABLE `therapist_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `therapist_id` INTEGER NOT NULL,
    `patient_id` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `therapist_notes_therapist_id_patient_id_created_at_idx`(`therapist_id`, `patient_id`, `created_at`),
    INDEX `therapist_notes_patient_id_idx`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointment_id` INTEGER NOT NULL,
    `patient_id` INTEGER NOT NULL,
    `therapist_id` INTEGER NOT NULL,
    `rating` TINYINT NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('pending', 'published', 'hidden') NOT NULL DEFAULT 'pending',
    `moderated_by_id` INTEGER NULL,
    `moderated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `session_reviews_appointment_id_key`(`appointment_id`),
    INDEX `session_reviews_therapist_id_status_idx`(`therapist_id`, `status`),
    INDEX `session_reviews_status_created_at_idx`(`status`, `created_at`),
    INDEX `session_reviews_patient_id_idx`(`patient_id`),
    INDEX `session_reviews_moderated_by_id_idx`(`moderated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `therapist_notes` ADD CONSTRAINT `therapist_notes_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `therapist_notes` ADD CONSTRAINT `therapist_notes_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reviews` ADD CONSTRAINT `session_reviews_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reviews` ADD CONSTRAINT `session_reviews_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reviews` ADD CONSTRAINT `session_reviews_therapist_id_fkey` FOREIGN KEY (`therapist_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reviews` ADD CONSTRAINT `session_reviews_moderated_by_id_fkey` FOREIGN KEY (`moderated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
