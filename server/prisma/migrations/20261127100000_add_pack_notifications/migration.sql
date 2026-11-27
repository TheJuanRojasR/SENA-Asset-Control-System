-- RN-INV-24: documentación de opcionales ausentes al empacar.
ALTER TABLE `requests` ADD COLUMN `packingNotes` TEXT NULL;

-- RN-NOT-01: aviso "listo para retirar" y vínculo del aviso con la solicitud.
ALTER TABLE `notifications` ADD COLUMN `requestId` INTEGER NULL;
ALTER TABLE `notifications` MODIFY `type` ENUM(
  'REQUEST_APPROVED','REQUEST_REJECTED','PICKUP_READY','STOCK_LOW','RETURN_REMINDER','SYSTEM'
) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE `notifications` ADD INDEX `notifications_requestId_idx`(`requestId`);
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_requestId_fkey`
  FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
