-- CreateTable
CREATE TABLE `contents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `content` LONGTEXT NULL,
    `image` VARCHAR(255) NULL,
    `created_by` VARCHAR(255) NULL,
    `updated_by` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;