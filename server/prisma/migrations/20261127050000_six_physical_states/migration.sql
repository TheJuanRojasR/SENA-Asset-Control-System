-- RN-INV-30: los estados físicos pasan de cuatro valores internos a la lista cerrada de seis.
-- Paso 1: enum temporal con valores viejos y nuevos para poder convertir los datos.
ALTER TABLE `inventory_units` MODIFY `physicalState` ENUM(
  'GOOD','REGULAR','DAMAGED','DISPOSED',
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NOT NULL DEFAULT 'OPERATIVO';

ALTER TABLE `request_items` MODIFY `physicalStateApproved` ENUM(
  'GOOD','REGULAR','DAMAGED','DISPOSED',
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NOT NULL DEFAULT 'OPERATIVO';

ALTER TABLE `request_item_units` MODIFY `physicalStateReturned` ENUM(
  'GOOD','REGULAR','DAMAGED','DISPOSED',
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NULL;

-- Paso 2: convertir datos existentes.
UPDATE `inventory_units` SET `physicalState` = 'OPERATIVO' WHERE `physicalState` = 'GOOD';
UPDATE `inventory_units` SET `physicalState` = 'CON_FALLA' WHERE `physicalState` = 'REGULAR';
UPDATE `inventory_units` SET `physicalState` = 'AVERIADO' WHERE `physicalState` = 'DAMAGED';
UPDATE `inventory_units` SET `physicalState` = 'DADO_DE_BAJA' WHERE `physicalState` = 'DISPOSED';

UPDATE `request_items` SET `physicalStateApproved` = 'OPERATIVO' WHERE `physicalStateApproved` = 'GOOD';
UPDATE `request_items` SET `physicalStateApproved` = 'CON_FALLA' WHERE `physicalStateApproved` = 'REGULAR';
UPDATE `request_items` SET `physicalStateApproved` = 'AVERIADO' WHERE `physicalStateApproved` = 'DAMAGED';
UPDATE `request_items` SET `physicalStateApproved` = 'DADO_DE_BAJA' WHERE `physicalStateApproved` = 'DISPOSED';

UPDATE `request_item_units` SET `physicalStateReturned` = 'OPERATIVO' WHERE `physicalStateReturned` = 'GOOD';
UPDATE `request_item_units` SET `physicalStateReturned` = 'CON_FALLA' WHERE `physicalStateReturned` = 'REGULAR';
UPDATE `request_item_units` SET `physicalStateReturned` = 'AVERIADO' WHERE `physicalStateReturned` = 'DAMAGED';
UPDATE `request_item_units` SET `physicalStateReturned` = 'DADO_DE_BAJA' WHERE `physicalStateReturned` = 'DISPOSED';

-- Paso 3: dejar solo la lista cerrada de seis.
ALTER TABLE `inventory_units` MODIFY `physicalState` ENUM(
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NOT NULL DEFAULT 'OPERATIVO';

ALTER TABLE `request_items` MODIFY `physicalStateApproved` ENUM(
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NOT NULL DEFAULT 'OPERATIVO';

ALTER TABLE `request_item_units` MODIFY `physicalStateReturned` ENUM(
  'OPERATIVO','DESCARGADO_AGOTADO','CON_FALLA','AVERIADO','EN_MANTENIMIENTO','DADO_DE_BAJA'
) NULL;
