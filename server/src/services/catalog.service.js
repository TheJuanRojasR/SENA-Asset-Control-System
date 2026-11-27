import { catalogRepository } from '../repositories/catalog.repository.js';

/**
 * Motor de disponibilidad del catálogo (Módulo 08).
 *
 * Semántica (declarada en `08-catalogo.md`, «Disponibilidad por rango de fechas»):
 * - El rango son días de calendario inclusivos en los dos extremos (RN-NEG-04).
 * - Una reserva descuenta solo dentro de su rango (RN-NEG-01/RN-NEG-02); una unidad
 *   prestada y no devuelta descuenta para cualquier rango (RN-NEG-05).
 * - Un consumible no se reserva por fechas: su cantidad es el stock (RN-INV-11).
 * - Una unidad en trámite de baja bloquea la unidad y sus piezas (RN-INV-33); una unidad
 *   declarada perdida sale del inventario activo y no bloquea, y sus piezas siguen
 *   prestables (RN-PRE-15, única excepción).
 * - Una pieza se presta según el estado del padre (nota de RN-INV-31 en
 *   `00-contexto-negocio.md`), y no se cuenta por separado si el conjunto está comprometido
 *   en el rango (RN-INV-08).
 *
 * Nota de deuda conocida: el modelo actual de `PhysicalState` tiene cuatro valores
 * (GOOD/REGULAR/DAMAGED/DISPOSED) y `RN-INV-30` fija seis. Mientras el módulo 05 no migre
 * el enum, se interpreta GOOD = OPERATIVO (único estado que presta la unidad como unidad),
 * REGULAR = CON_FALLA del equipo reparable, DAMAGED = AVERIADO y DISPOSED = DADO_DE_BAJA.
 */

const ACTIVE_RESERVATION_STATUSES = new Set(['PENDING', 'APPROVED', 'PACKED']);
const COUNTED_UNIT_STATUSES = new Set(['AVAILABLE', 'RESERVED']);

const toUtcDay = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const parseRange = ({ from, to }) => {
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = from || today;
  const toDate = to || today;
  return {
    from: fromDate,
    to: toDate,
    fromMs: Date.parse(`${fromDate}T00:00:00Z`),
    toMs: Date.parse(`${toDate}T00:00:00Z`),
  };
};

const hasOverlappingReservation = (unit, range) =>
  (unit.requestItemUnits || []).some((assignment) => {
    const request = assignment.requestItem?.request;
    if (!request) return false;
    if (!ACTIVE_RESERVATION_STATUSES.has(request.status)) return false;

    const startMs = toUtcDay(request.requestDate);
    const endMs = toUtcDay(request.estimatedDate ?? request.requestDate);
    return startMs <= range.toMs && endMs >= range.fromMs;
  });

const isLostOrDisposed = (unit) =>
  unit.declaredLost || unit.status === 'DISPOSED' || unit.physicalState === 'DISPOSED';

/**
 * ¿La pieza `unit` está bloqueada por su conjunto padre?
 * - Padre perdido: la pieza sigue prestable (excepción RN-PRE-15). No bloquea.
 * - Padre en trámite de baja, dado de baja, prestado o reservado en el rango: bloquea.
 */
const isPieceBlockedByParent = (unit, range) => {
  const parent = unit.parentUnit;
  if (!parent) return true;
  if (parent.declaredLost) return false;
  if (parent.disposalInProgress) return true;
  if (parent.status === 'DISPOSED' || parent.physicalState === 'DISPOSED') return true;
  if (parent.status === 'LOANED') return true;
  if (parent.status === 'RESERVED' && hasOverlappingReservation(parent, range)) return true;
  return false;
};

const isUnitAvailableForRange = (unit, range) => {
  if (isLostOrDisposed(unit)) return false;
  if (unit.disposalInProgress) return false;
  if (!COUNTED_UNIT_STATUSES.has(unit.status)) return false;

  if (unit.parentUnitId) {
    // Pieza de un conjunto: se decide por el estado del padre y por su propio compromiso.
    if (isPieceBlockedByParent(unit, range)) return false;
    if (unit.status === 'RESERVED' && hasOverlappingReservation(unit, range)) return false;
    return true;
  }

  // Unidad como unidad: RN-INV-31 — solo OPERATIVO se presta como unidad en el modelo actual.
  if (unit.physicalState !== 'GOOD') return false;
  if (unit.status === 'RESERVED' && hasOverlappingReservation(unit, range)) return false;
  return true;
};

const availableQtyForItem = (item, units, range) => {
  // RN-INV-11 / AC-CAT-03-10: el consumible informa su stock, igual en cualquier rango.
  if (item.isConsumable) return item.stock ?? 0;
  return units.filter((unit) => isUnitAvailableForRange(unit, range)).length;
};

export const catalogService = {
  async listCatalog(query) {
    const range = parseRange(query);
    const filters = {
      search: query.search,
      // Los query params llegan como texto; Prisma exige Int en categoryId.
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    };
    const pagination = {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    const [items, total] = await Promise.all([
      catalogRepository.findItems(filters, pagination),
      catalogRepository.countItems(filters),
    ]);

    const units = await catalogRepository.findUnitsByItemIds(items.map((item) => item.id));
    const unitsByItem = new Map();
    for (const unit of units) {
      const list = unitsByItem.get(unit.itemId) || [];
      list.push(unit);
      unitsByItem.set(unit.itemId, list);
    }

    const data = items.map((item) => {
      const availableQty = availableQtyForItem(
        item,
        unitsByItem.get(item.id) || [],
        range
      );
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        unit: item.unit,
        isConsumable: item.isConsumable,
        minStock: item.minStock,
        category: item.category,
        availableQty,
        // RN-CAT-05: un elemento con 0 sigue listado pero no se ofrece como seleccionable.
        selectable: availableQty > 0,
      };
    });

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
      // RN-CAT-04: la cantidad siempre viaja con el rango que la produce.
      range: { from: range.from, to: range.to },
    };
  },
};
