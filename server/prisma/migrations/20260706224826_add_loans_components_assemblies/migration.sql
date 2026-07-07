-- AlterTable
ALTER TABLE `inventory_units` ADD COLUMN `parentUnitId` INTEGER NULL;

-- AlterTable
ALTER TABLE `request_item_units` ADD COLUMN `loanedAt` DATETIME(3) NULL,
    ADD COLUMN `physicalStateReturned` ENUM('GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED') NULL,
    ADD COLUMN `returnedAt` DATETIME(3) NULL,
    ADD COLUMN `returnedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `requests` MODIFY `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PACKED', 'DELIVERED', 'PARTIALLY_RETURNED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `item_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentItemId` INTEGER NOT NULL,
    `childItemId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `item_components_parentItemId_idx`(`parentItemId`),
    INDEX `item_components_childItemId_idx`(`childItemId`),
    UNIQUE INDEX `item_components_parentItemId_childItemId_key`(`parentItemId`, `childItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `inventory_units_parentUnitId_idx` ON `inventory_units`(`parentUnitId`);

-- CreateIndex
CREATE INDEX `request_item_units_returnedById_idx` ON `request_item_units`(`returnedById`);

-- AddForeignKey
ALTER TABLE `inventory_units` ADD CONSTRAINT `inventory_units_parentUnitId_fkey` FOREIGN KEY (`parentUnitId`) REFERENCES `inventory_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_components` ADD CONSTRAINT `item_components_parentItemId_fkey` FOREIGN KEY (`parentItemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_components` ADD CONSTRAINT `item_components_childItemId_fkey` FOREIGN KEY (`childItemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_item_units` ADD CONSTRAINT `request_item_units_returnedById_fkey` FOREIGN KEY (`returnedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
