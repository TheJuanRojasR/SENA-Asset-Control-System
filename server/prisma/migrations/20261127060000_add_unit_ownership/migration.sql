-- RN-INV-20: la tenencia de un equipo serializado vive en la unidad física.
ALTER TABLE `inventory_units` ADD COLUMN `ownership` ENUM('SENA', 'DONATED') NOT NULL DEFAULT 'SENA';
