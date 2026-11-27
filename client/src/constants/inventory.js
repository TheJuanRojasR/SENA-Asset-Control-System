export const SHIFTS = {
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
  NIGHT: 'NIGHT',
};

export const SHIFT_OPTIONS = [
  { value: SHIFTS.MORNING, label: 'Mañana' },
  { value: SHIFTS.AFTERNOON, label: 'Tarde' },
  { value: SHIFTS.NIGHT, label: 'Noche' },
];

// RN-INV-30: lista cerrada de seis estados físicos.
export const PHYSICAL_STATES = {
  OPERATIVO: 'OPERATIVO',
  DESCARGADO_AGOTADO: 'DESCARGADO_AGOTADO',
  CON_FALLA: 'CON_FALLA',
  AVERIADO: 'AVERIADO',
  EN_MANTENIMIENTO: 'EN_MANTENIMIENTO',
  DADO_DE_BAJA: 'DADO_DE_BAJA',
};

export const PHYSICAL_STATE_OPTIONS = [
  { value: PHYSICAL_STATES.OPERATIVO, label: 'Operativo' },
  { value: PHYSICAL_STATES.DESCARGADO_AGOTADO, label: 'Descargado / agotado' },
  { value: PHYSICAL_STATES.CON_FALLA, label: 'Con falla' },
  { value: PHYSICAL_STATES.AVERIADO, label: 'Averiado' },
  { value: PHYSICAL_STATES.EN_MANTENIMIENTO, label: 'En mantenimiento' },
  { value: PHYSICAL_STATES.DADO_DE_BAJA, label: 'Dado de baja' },
];

export const INVENTORY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  LOANED: 'LOANED',
  MAINTENANCE: 'MAINTENANCE',
  DISPOSED: 'DISPOSED',
};

export const INVENTORY_STATUS_OPTIONS = [
  { value: INVENTORY_STATUS.AVAILABLE, label: 'Disponible' },
  { value: INVENTORY_STATUS.RESERVED, label: 'Reservado' },
  { value: INVENTORY_STATUS.LOANED, label: 'Prestado' },
  { value: INVENTORY_STATUS.MAINTENANCE, label: 'Mantenimiento' },
  { value: INVENTORY_STATUS.DISPOSED, label: 'Dado de baja' },
];

export const UNITS = {
  UNIT: 'UNIDAD',
  METER: 'METRO',
  KILOGRAM: 'KILOGRAMO',
  LITER: 'LITRO',
  BOX: 'CAJA',
  ROLL: 'ROLLO',
  SET: 'JUEGO',
  PAIR: 'PAR',
};

export const UNIT_OPTIONS = [
  { value: UNITS.UNIT, label: 'Unidad' },
  { value: UNITS.METER, label: 'Metro' },
  { value: UNITS.KILOGRAM, label: 'Kilogramo' },
  { value: UNITS.LITER, label: 'Litro' },
  { value: UNITS.BOX, label: 'Caja' },
  { value: UNITS.ROLL, label: 'Rollo' },
  { value: UNITS.SET, label: 'Juego' },
  { value: UNITS.PAIR, label: 'Par' },
];
