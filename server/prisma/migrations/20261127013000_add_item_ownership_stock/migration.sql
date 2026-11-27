-- RN-INV-44: umbral mínimo opcional (sin umbral no hay alerta).
ALTER TABLE `items` MODIFY `minStock` INTEGER NULL;

-- RN-INV-07 / RN-INV-46: tenencia del elemento; solo DONATED puede ser consumible.
ALTER TABLE `items` ADD COLUMN `ownership` ENUM('SENA', 'DONATED') NOT NULL DEFAULT 'SENA';

-- RN-INV-06: existencia del consumible controlada por cantidad.
ALTER TABLE `items` ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0;
