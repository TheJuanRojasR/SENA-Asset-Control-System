import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCartValidation } from '../../src/hooks/useCartValidation.js';
import { itemsApi } from '../../src/api/items.api.js';

vi.mock('../../src/api/items.api.js', () => ({
  itemsApi: {
    getAll: vi.fn(),
  },
}));

/** Envuelve la respuesta con la estructura paginada del backend. */
function apiListResponse(items) {
  return { data: { data: { data: items, meta: {} } } };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useCartValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta la API cuando el carrito está vacío', async () => {
    const { result } = renderHook(() => useCartValidation([]), { wrapper: createWrapper() });

    expect(itemsApi.getAll).not.toHaveBeenCalled();
    expect(result.current.hasIssues).toBe(false);
    expect(result.current.issues).toEqual([]);
  });

  it('no reporta problemas cuando hay stock suficiente', async () => {
    itemsApi.getAll.mockResolvedValue(
      apiListResponse([{ id: 1, name: 'Martillo', available: 10 }])
    );

    const { result } = renderHook(
      () => useCartValidation([{ id: 1, name: 'Martillo', quantity: 3 }]),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isValidating).toBe(false));

    expect(result.current.hasIssues).toBe(false);
    expect(result.current.issues).toEqual([]);
  });

  it('reporta ítems cuya cantidad supera la disponibilidad', async () => {
    itemsApi.getAll.mockResolvedValue(apiListResponse([{ id: 1, name: 'Martillo', available: 2 }]));

    const { result } = renderHook(
      () => useCartValidation([{ id: 1, name: 'Martillo', quantity: 5 }]),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.hasIssues).toBe(true));

    expect(result.current.issues[0]).toEqual({
      itemId: 1,
      name: 'Martillo',
      requested: 5,
      available: 2,
      missing: false,
    });
  });

  it('marca como faltantes los ítems que ya no existen en el catálogo', async () => {
    itemsApi.getAll.mockResolvedValue(apiListResponse([]));

    const { result } = renderHook(
      () => useCartValidation([{ id: 99, name: 'Obsoleto', quantity: 1 }]),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.hasIssues).toBe(true));

    expect(result.current.issues[0]).toMatchObject({ itemId: 99, missing: true, available: 0 });
  });

  it('usa el stock total cuando no hay campo available', async () => {
    itemsApi.getAll.mockResolvedValue(apiListResponse([{ id: 1, name: 'Martillo', stock: 4 }]));

    const { result } = renderHook(() => useCartValidation([{ id: 1, quantity: 6 }]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasIssues).toBe(true));

    expect(result.current.issues[0].available).toBe(4);
  });

  it('expone validationFailed cuando la consulta falla', async () => {
    itemsApi.getAll.mockRejectedValue(new Error('server down'));

    const { result } = renderHook(() => useCartValidation([{ id: 1, quantity: 1 }]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.validationFailed).toBe(true));

    expect(result.current.hasIssues).toBe(false);
  });
});
