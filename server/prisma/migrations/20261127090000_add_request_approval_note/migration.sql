-- RN-SOL-04: nota obligatoria del administrador al aprobar menos de lo solicitado.
ALTER TABLE `requests` ADD COLUMN `approvalNote` TEXT NULL;
