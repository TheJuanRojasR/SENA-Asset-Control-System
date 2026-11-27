-- RN-MOV-01: eventos de alta, ensamblaje, desensamblaje y reserva que faltaban en el enum.
ALTER TABLE `movements` MODIFY `type` ENUM(
  'ENTRY', 'ASSEMBLY', 'DISASSEMBLY', 'RESERVATION',
  'LOAN', 'RETURN', 'DISPOSAL', 'ADJUSTMENT', 'RESTOCK'
) NOT NULL;
