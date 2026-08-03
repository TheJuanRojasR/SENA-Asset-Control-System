import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../src/stores/cartStore.js';

const sampleItem = {
  id: 1,
  name: 'Martillo',
  code: 'MTR-001',
  stock: 10,
};

const anotherItem = {
  id: 2,
  name: 'Destornillador',
  code: 'DST-002',
  stock: 5,
};

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('agrega un ítem al carrito', () => {
    useCartStore.getState().addItem(sampleItem, 3);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('acumula cantidad si el ítem ya existe sin superar el stock', () => {
    useCartStore.getState().addItem(sampleItem, 3);
    useCartStore.getState().addItem(sampleItem, 4);

    expect(useCartStore.getState().items[0].quantity).toBe(7);
  });

  it('no permite superar el stock disponible', () => {
    useCartStore.getState().addItem(sampleItem, 15);

    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });

  it('actualiza la cantidad de un ítem', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    useCartStore.getState().updateQty(sampleItem.id, 5);

    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('elimina un ítem cuando la cantidad se actualiza a cero', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    useCartStore.getState().updateQty(sampleItem.id, 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('elimina un ítem por id', () => {
    useCartStore.getState().addItem(sampleItem, 1);
    useCartStore.getState().addItem(anotherItem, 1);
    useCartStore.getState().removeItem(sampleItem.id);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe(anotherItem.id);
  });

  it('calcula el total de ítems', () => {
    useCartStore.getState().addItem(sampleItem, 3);
    useCartStore.getState().addItem(anotherItem, 2);

    expect(useCartStore.getState().getTotalItems()).toBe(5);
  });

  it('limpia el carrito', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().getTotalItems()).toBe(0);
  });

  it('prioriza la disponibilidad (available) sobre el stock total', () => {
    const limitedItem = { ...sampleItem, available: 4 };

    const result = useCartStore.getState().addItem(limitedItem, 10);

    expect(result.capped).toBe(true);
    expect(result.maxStock).toBe(4);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
  });

  it('describe el resultado al agregar un ítem', () => {
    const result = useCartStore.getState().addItem(sampleItem, 3);

    expect(result).toEqual({ added: true, quantity: 3, capped: false, maxStock: 10 });
  });

  it('rechaza agregar cuando no hay disponibilidad', () => {
    const result = useCartStore.getState().addItem({ ...sampleItem, available: 0 }, 2);

    expect(result.added).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('cartStore.syncWithCatalog', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('ajusta cantidades que superan la disponibilidad actual', () => {
    useCartStore.getState().addItem(sampleItem, 8);

    const adjustments = useCartStore.getState().syncWithCatalog([{ ...sampleItem, available: 3 }]);

    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({ itemId: 1, previousQty: 8, newQty: 3 });
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('elimina ítems cuya disponibilidad llegó a cero', () => {
    useCartStore.getState().addItem(sampleItem, 5);

    const adjustments = useCartStore.getState().syncWithCatalog([{ ...sampleItem, available: 0 }]);

    expect(adjustments[0]).toMatchObject({ itemId: 1, newQty: 0 });
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('actualiza el stock almacenado sin tocar cantidades válidas', () => {
    useCartStore.getState().addItem(sampleItem, 2);

    const adjustments = useCartStore.getState().syncWithCatalog([{ ...sampleItem, available: 6 }]);

    expect(adjustments).toHaveLength(0);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().items[0].stock).toBe(6);
  });

  it('conserva ítems ausentes en el catálogo fresco', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    useCartStore.getState().addItem(anotherItem, 1);

    const adjustments = useCartStore.getState().syncWithCatalog([{ ...sampleItem, available: 10 }]);

    expect(adjustments).toHaveLength(0);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('retorna lista vacía con entradas inválidas', () => {
    useCartStore.getState().addItem(sampleItem, 2);

    expect(useCartStore.getState().syncWithCatalog([])).toEqual([]);
    expect(useCartStore.getState().syncWithCatalog(null)).toEqual([]);
  });
});
