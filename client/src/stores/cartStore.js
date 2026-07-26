import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Disponibilidad efectiva de un ítem del catálogo.
 * El backend valida solicitudes contra unidades disponibles (`available`),
 * no contra el stock total, así que ese valor tiene prioridad.
 */
function getEffectiveStock(item) {
  const available = item?.available ?? item?.stock;
  return Math.max(0, Number(available) || 0);
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Agrega un ítem al carrito (o acumula su cantidad) sin superar el
       * stock disponible. Retorna un descriptor del resultado para que la
       * UI pueda dar feedback: { added, quantity, capped, maxStock }.
       */
      addItem: (item, qty) => {
        const safeQty = Math.max(1, Number(qty) || 1);
        const maxStock = getEffectiveStock(item);
        const quantity = Math.min(safeQty, maxStock);

        if (quantity <= 0) {
          return { added: false, quantity: 0, capped: false, maxStock };
        }

        let result = { added: true, quantity, capped: quantity < safeQty, maxStock };

        set((state) => {
          const existing = state.items.find((cartItem) => cartItem.id === item.id);

          if (existing) {
            const newQty = Math.min(existing.quantity + quantity, maxStock);
            result = {
              added: newQty > existing.quantity,
              quantity: newQty,
              capped: newQty < existing.quantity + quantity,
              maxStock,
            };
            return {
              items: state.items.map((cartItem) =>
                cartItem.id === item.id
                  ? { ...cartItem, ...item, stock: maxStock, quantity: newQty }
                  : cartItem
              ),
            };
          }

          return { items: [...state.items, { ...item, stock: maxStock, quantity }] };
        });

        return result;
      },

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((cartItem) => cartItem.id !== itemId),
        })),

      updateQty: (itemId, qty) =>
        set((state) => ({
          items: state.items
            .map((cartItem) => {
              if (cartItem.id !== itemId) return cartItem;
              const maxStock = getEffectiveStock(cartItem);
              const newQty = Math.max(0, Math.min(Number(qty) || 0, maxStock));
              return { ...cartItem, quantity: newQty };
            })
            .filter((cartItem) => cartItem.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((sum, cartItem) => sum + cartItem.quantity, 0),

      /**
       * Reconcilia el carrito con datos frescos del catálogo.
       * Actualiza el stock almacenado y ajusta/elimina cantidades que ya no
       * tienen disponibilidad. Ítems ausentes en `freshItems` se conservan
       * (no se asume que fueron eliminados del catálogo).
       *
       * @param {Array} freshItems - Ítems actuales del catálogo.
       * @returns {Array<{ itemId: number, name: string, previousQty: number, newQty: number, available: number }>}
       *          Lista de ajustes aplicados (vacía si el carrito ya era consistente).
       */
      syncWithCatalog: (freshItems) => {
        if (!Array.isArray(freshItems) || freshItems.length === 0) return [];

        const freshById = new Map(freshItems.map((fresh) => [fresh.id, fresh]));
        const adjustments = [];

        set((state) => ({
          items: state.items
            .map((cartItem) => {
              const fresh = freshById.get(cartItem.id);
              if (!fresh) return cartItem;

              const available = getEffectiveStock(fresh);
              const newQty = Math.min(cartItem.quantity, available);

              if (newQty !== cartItem.quantity) {
                adjustments.push({
                  itemId: cartItem.id,
                  name: cartItem.name,
                  previousQty: cartItem.quantity,
                  newQty,
                  available,
                });
              }

              return { ...cartItem, ...fresh, stock: available, quantity: newQty };
            })
            .filter((cartItem) => cartItem.quantity > 0),
        }));

        return adjustments;
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

/**
 * Selector reactivo del total de unidades en el carrito.
 * Retorna un primitivo, por lo que es seguro para suscripciones granulares:
 * `const totalItems = useCartStore(selectTotalItems);`
 */
export const selectTotalItems = (state) =>
  state.items.reduce((sum, cartItem) => sum + cartItem.quantity, 0);

/** Selector reactivo de la cantidad de referencias distintas en el carrito. */
export const selectDistinctItems = (state) => state.items.length;
