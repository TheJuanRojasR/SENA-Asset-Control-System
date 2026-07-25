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

export const PHYSICAL_STATES = {
  GOOD: 'GOOD',
  REGULAR: 'REGULAR',
  DAMAGED: 'DAMAGED',
  DISPOSED: 'DISPOSED',
};

export const PHYSICAL_STATE_OPTIONS = [
  { value: PHYSICAL_STATES.GOOD, label: 'Bueno' },
  { value: PHYSICAL_STATES.REGULAR, label: 'Regular' },
  { value: PHYSICAL_STATES.DAMAGED, label: 'Dañado' },
  { value: PHYSICAL_STATES.DISPOSED, label: 'Dado de baja' },
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
