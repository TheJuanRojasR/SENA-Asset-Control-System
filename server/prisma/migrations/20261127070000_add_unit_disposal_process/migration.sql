-- RN-INV-17 / RN-INV-19: motivo y actores de la baja (inmediata de donada o trámite del SENA).
ALTER TABLE `inventory_units`
  ADD COLUMN `disposalReason` TEXT NULL,
  ADD COLUMN `disposalStartedAt` DATETIME(3) NULL,
  ADD COLUMN `disposalStartedById` INTEGER NULL,
  ADD COLUMN `disposalConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN `disposalConfirmedById` INTEGER NULL;
