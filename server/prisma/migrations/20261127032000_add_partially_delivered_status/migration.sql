-- RN-SOL-11: una entrega parcial deja la solicitud en PARTIALLY_DELIVERED. El estado faltaba
-- en el enum y es necesario para el cierre y la devolución de préstamos.
ALTER TABLE `requests` MODIFY `status` ENUM(
  'PENDING', 'APPROVED', 'REJECTED', 'PACKED', 'DELIVERED',
  'PARTIALLY_DELIVERED', 'PARTIALLY_RETURNED', 'COMPLETED', 'CANCELLED'
) NOT NULL DEFAULT 'PENDING';
