-- RN-PRE-05/08/10: condición de retorno en dos ejes + descripción, por unidad devuelta.
ALTER TABLE `request_item_units`
  ADD COLUMN `returnFunctioning` ENUM('FUNCIONA', 'FUNCIONA_CON_FALLA', 'NO_FUNCIONA') NULL,
  ADD COLUMN `returnDamageState` ENUM('SIN_DANO', 'DESGASTE_NORMAL', 'DANADO') NULL,
  ADD COLUMN `returnDescription` TEXT NULL;

-- RN-PRE-15/16: pérdida declarada de una unidad prestada (motivo y actor).
ALTER TABLE `request_item_units`
  ADD COLUMN `lostAt` DATETIME(3) NULL,
  ADD COLUMN `lostById` INTEGER NULL;

CREATE INDEX `request_item_units_lostById_idx` ON `request_item_units`(`lostById`);
ALTER TABLE `request_item_units` ADD CONSTRAINT `request_item_units_lostById_fkey` FOREIGN KEY (`lostById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RN-PRE-06/09: tarea pendiente por daño, con dos estados y resolución del administrador.
CREATE TABLE `damage_tasks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `inventoryUnitId` INTEGER NOT NULL,
  `requestItemUnitId` INTEGER NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  `createdById` INTEGER NULL,
  `resolvedById` INTEGER NULL,
  `resolvedAt` DATETIME(3) NULL,
  `resolutionNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `damage_tasks_inventoryUnitId_idx` ON `damage_tasks`(`inventoryUnitId`);
CREATE INDEX `damage_tasks_status_idx` ON `damage_tasks`(`status`);
CREATE INDEX `damage_tasks_createdById_idx` ON `damage_tasks`(`createdById`);
CREATE INDEX `damage_tasks_resolvedById_idx` ON `damage_tasks`(`resolvedById`);
ALTER TABLE `damage_tasks` ADD CONSTRAINT `damage_tasks_inventoryUnitId_fkey` FOREIGN KEY (`inventoryUnitId`) REFERENCES `inventory_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `damage_tasks` ADD CONSTRAINT `damage_tasks_requestItemUnitId_fkey` FOREIGN KEY (`requestItemUnitId`) REFERENCES `request_item_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `damage_tasks` ADD CONSTRAINT `damage_tasks_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `damage_tasks` ADD CONSTRAINT `damage_tasks_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
