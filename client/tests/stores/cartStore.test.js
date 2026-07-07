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
});
