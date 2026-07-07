-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'INSTRUCTOR') NOT NULL,
    `phone` VARCHAR(50) NULL,
    `document` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `users_role_idx`(`role`),
    INDEX `users_isActive_idx`(`isActive`),
    UNIQUE INDEX `users_email_isDeleted_key`(`email`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `environments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `environments_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `categoryId` INTEGER NOT NULL,
    `minStock` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(50) NOT NULL DEFAULT 'UNIDAD',
    `isConsumable` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `items_code_key`(`code`),
    INDEX `items_categoryId_idx`(`categoryId`),
    INDEX `items_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `serialNumber` VARCHAR(255) NOT NULL,
    `environmentId` INTEGER NULL,
    `status` ENUM('AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
    `physicalState` ENUM('GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED') NOT NULL DEFAULT 'GOOD',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_units_serialNumber_key`(`serialNumber`),
    INDEX `inventory_units_itemId_idx`(`itemId`),
    INDEX `inventory_units_status_idx`(`status`),
    INDEX `inventory_units_environmentId_idx`(`environmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `environmentId` INTEGER NULL,
    `shift` VARCHAR(50) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PACKED', 'DELIVERED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estimatedDate` DATETIME(3) NULL,
    `observations` TEXT NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `rejectedById` INTEGER NULL,
    `rejectedAt` DATETIME(3) NULL,
    `packedById` INTEGER NULL,
    `packedAt` DATETIME(3) NULL,
    `deliveredById` INTEGER NULL,
    `deliveredAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `requests_code_key`(`code`),
    INDEX `requests_requesterId_idx`(`requesterId`),
    INDEX `requests_status_idx`(`status`),
    INDEX `requests_requestDate_idx`(`requestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `requestedQty` INTEGER NOT NULL,
    `approvedQty` INTEGER NULL,
    `deliveredQty` INTEGER NOT NULL DEFAULT 0,
    `returnedQty` INTEGER NOT NULL DEFAULT 0,
    `physicalStateApproved` ENUM('GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED') NOT NULL DEFAULT 'GOOD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `request_items_requestId_idx`(`requestId`),
    INDEX `request_items_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('LOAN', 'RETURN', 'RESTOCK', 'ADJUSTMENT', 'DISPOSAL') NOT NULL,
    `itemId` INTEGER NULL,
    `inventoryUnitId` INTEGER NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `responsibleId` INTEGER NULL,
    `requestId` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movements_itemId_idx`(`itemId`),
    INDEX `movements_inventoryUnitId_idx`(`inventoryUnitId`),
    INDEX `movements_requestId_idx`(`requestId`),
    INDEX `movements_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('REQUEST_APPROVED', 'REQUEST_REJECTED', 'STOCK_LOW', 'RETURN_REMINDER', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_read_idx`(`read`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_units` ADD CONSTRAINT `inventory_units_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_units` ADD CONSTRAINT `inventory_units_environmentId_fkey` FOREIGN KEY (`environmentId`) REFERENCES `environments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_rejectedById_fkey` FOREIGN KEY (`rejectedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_packedById_fkey` FOREIGN KEY (`packedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_deliveredById_fkey` FOREIGN KEY (`deliveredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_environmentId_fkey` FOREIGN KEY (`environmentId`) REFERENCES `environments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_items` ADD CONSTRAINT `request_items_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_items` ADD CONSTRAINT `request_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_inventoryUnitId_fkey` FOREIGN KEY (`inventoryUnitId`) REFERENCES `inventory_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
