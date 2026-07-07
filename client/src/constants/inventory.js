export const SHIFTS = {
  MORNING: 'MAÑANA',
  AFTERNOON: 'TARDE',
  EVENING: 'NOCHE',
};

export const SHIFT_OPTIONS = [
  { value: SHIFTS.MORNING, label: 'Mañana' },
  { value: SHIFTS.AFTERNOON, label: 'Tarde' },
  { value: SHIFTS.EVENING, label: 'Noche' },
];

export const PHYSICAL_STATES = {
  GOOD: 'BUENO',
  REGULAR: 'REGULAR',
  BAD: 'MALO',
  DAMAGED: 'DAÑADO',
};

export const PHYSICAL_STATE_OPTIONS = [
  { value: PHYSICAL_STATES.GOOD, label: 'Bueno' },
  { value: PHYSICAL_STATES.REGULAR, label: 'Regular' },
  { value: PHYSICAL_STATES.BAD, label: 'Malo' },
  { value: PHYSICAL_STATES.DAMAGED, label: 'Dañado' },
];

export const INVENTORY_STATUS = {
  ACTIVE: 'ACTIVO',
  INACTIVE: 'INACTIVO',
  LOW: 'BAJA',
};

export const INVENTORY_STATUS_OPTIONS = [
  { value: INVENTORY_STATUS.ACTIVE, label: 'Activo' },
  { value: INVENTORY_STATUS.INACTIVE, label: 'Inactivo' },
  { value: INVENTORY_STATUS.LOW, label: 'De baja' },
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
