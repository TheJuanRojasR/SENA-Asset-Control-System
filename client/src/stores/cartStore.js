import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty) => {
        const safeQty = Math.max(1, Number(qty) || 1);
        const maxStock = item.stock ?? 0;
        const quantity = Math.min(safeQty, maxStock);

        if (quantity <= 0) return;

        set((state) => {
          const existing = state.items.find((cartItem) => cartItem.id === item.id);

          if (existing) {
            const newQty = Math.min(existing.quantity + quantity, maxStock);
            return {
              items: state.items.map((cartItem) =>
                cartItem.id === item.id ? { ...cartItem, quantity: newQty } : cartItem
              ),
            };
          }

          return { items: [...state.items, { ...item, quantity }] };
        });
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
              const maxStock = cartItem.stock ?? 0;
              const newQty = Math.max(0, Math.min(Number(qty) || 0, maxStock));
              return { ...cartItem, quantity: newQty };
            })
            .filter((cartItem) => cartItem.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
    }),
    {
      name: 'cart-storage',
    }
  )
);
