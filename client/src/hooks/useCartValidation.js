import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items.api.js';
import { extractListData } from '../utils/api.js';

/**
 * Valida en tiempo real el contenido del carrito contra el stock fresco
 * del catálogo.
 *
 * Reutiliza la query `['items']` (misma clave que el catálogo), de modo que
 * comparte caché y no genera peticiones duplicadas; React Query se encarga
 * del refetch al montar la página del carrito.
 *
 * @param {Array<{ id: number, name?: string, quantity: number }>} cartItems
 * @returns {{
 *   issues: Array<{ itemId: number, name: string, requested: number, available: number, missing: boolean }>,
 *   hasIssues: boolean,
 *   isValidating: boolean,
 *   validationFailed: boolean,
 *   freshItems: Array,
 * }}
 *   - issues: ítems cuya cantidad solicitada supera la disponibilidad actual
 *     o que ya no existen en el catálogo (missing: true).
 *   - hasIssues: true si hay al menos un problema (bloquea el envío).
 *   - isValidating: true mientras se obtiene el stock fresco por primera vez.
 *   - validationFailed: true si la consulta de stock falló (la UI decide cómo proceder).
 */
export function useCartValidation(cartItems) {
  const hasCartItems = Array.isArray(cartItems) && cartItems.length > 0;

  const {
    data: freshItems,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
    select: extractListData,
    enabled: hasCartItems,
  });

  const issues = useMemo(() => {
    if (!hasCartItems || !Array.isArray(freshItems)) return [];

    const freshById = new Map(freshItems.map((item) => [item.id, item]));

    return cartItems.reduce((acc, cartItem) => {
      const fresh = freshById.get(cartItem.id);

      if (!fresh) {
        acc.push({
          itemId: cartItem.id,
          name: cartItem.name || `Ítem #${cartItem.id}`,
          requested: cartItem.quantity,
          available: 0,
          missing: true,
        });
        return acc;
      }

      const available = Math.max(0, Number(fresh.available ?? fresh.stock) || 0);
      if (cartItem.quantity > available) {
        acc.push({
          itemId: cartItem.id,
          name: fresh.name || cartItem.name || `Ítem #${cartItem.id}`,
          requested: cartItem.quantity,
          available,
          missing: false,
        });
      }

      return acc;
    }, []);
  }, [cartItems, freshItems, hasCartItems]);

  return {
    issues,
    hasIssues: issues.length > 0,
    isValidating: hasCartItems && isLoading,
    validationFailed: hasCartItems && isError,
    freshItems: Array.isArray(freshItems) ? freshItems : [],
  };
}
