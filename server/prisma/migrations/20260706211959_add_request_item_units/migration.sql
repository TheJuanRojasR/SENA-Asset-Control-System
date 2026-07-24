-- CreateTable
CREATE TABLE `request_item_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestItemId` INTEGER NOT NULL,
    `inventoryUnitId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `request_item_units_inventoryUnitId_key`(`inventoryUnitId`),
    INDEX `request_item_units_requestItemId_idx`(`requestItemId`),
    INDEX `request_item_units_inventoryUnitId_idx`(`inventoryUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `request_item_units` ADD CONSTRAINT `request_item_units_requestItemId_fkey` FOREIGN KEY (`requestItemId`) REFERENCES `request_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_item_units` ADD CONSTRAINT `request_item_units_inventoryUnitId_fkey` FOREIGN KEY (`inventoryUnitId`) REFERENCES `inventory_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
