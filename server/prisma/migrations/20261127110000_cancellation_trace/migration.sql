-- RN-SOL-10 / AC-SOL-08-3: causa de la cancelación (manual o vencimiento).
ALTER TABLE `requests` ADD COLUMN `cancellation_cause` ENUM('MANUAL', 'EXPIRED') NULL;

-- RN-SOL-08 / RN-PRE-02: conservar la traza de las unidades asignadas al cancelar.
ALTER TABLE `request_item_units` ADD COLUMN `releasedAt` DATETIME(3) NULL;
