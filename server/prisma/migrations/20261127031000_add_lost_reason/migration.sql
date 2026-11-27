-- RN-PRE-15: motivo de la pérdida declarada (texto libre, junto con lostAt y lostById).
ALTER TABLE `request_item_units` ADD COLUMN `lostReason` TEXT NULL;
