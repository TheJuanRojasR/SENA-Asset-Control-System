-- RN-INV-33 / RN-PRE-15: el trámite de baja y la pérdida declarada no son estados físicos;
-- se modelan como marcas de la unidad.
ALTER TABLE `inventory_units` ADD COLUMN `disposalInProgress` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `inventory_units` ADD COLUMN `declaredLost` BOOLEAN NOT NULL DEFAULT false;
