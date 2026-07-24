/*
  Warnings:

  - A unique constraint covering the columns `[requestItemId,inventoryUnitId]` on the table `request_item_units` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `request_item_units_inventoryUnitId_key` ON `request_item_units`;

-- CreateIndex
CREATE UNIQUE INDEX `request_item_units_requestItemId_inventoryUnitId_key` ON `request_item_units`(`requestItemId`, `inventoryUnitId`);
