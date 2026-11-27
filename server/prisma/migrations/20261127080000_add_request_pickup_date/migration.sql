-- RN-SOL-01: fecha de retiro separada de la fecha de creación. Las filas existentes usan la
-- fecha de la solicitud como fecha de retiro para no dejar rangos vacíos.
ALTER TABLE `requests` ADD COLUMN `pickupDate` DATETIME(3) NULL;
UPDATE `requests` SET `pickupDate` = `requestDate` WHERE `pickupDate` IS NULL;
