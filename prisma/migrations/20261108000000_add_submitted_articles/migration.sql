-- CreateTable : articles proposés par un thérapeute/modérateur/admin, en
-- attente de relecture avant publication sur le blog public.
CREATE TABLE `submitted_articles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `author_id` INTEGER NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `excerpt` VARCHAR(300) NOT NULL,
    `body` TEXT NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `status` ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `submitted_articles_slug_key`(`slug`),
    INDEX `submitted_articles_status_idx`(`status`),
    INDEX `submitted_articles_author_id_idx`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `submitted_articles` ADD CONSTRAINT `submitted_articles_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submitted_articles` ADD CONSTRAINT `submitted_articles_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
