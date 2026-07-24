/**
 * Extrae el arreglo de registros de una respuesta paginada del backend.
 * El backend envuelve las listas así:
 * { success, data: { data: [...], meta: {...} } }
 */
export function extractListData(response) {
  return response?.data?.data?.data ?? [];
}

/**
 * Extrae los metadatos de paginación de una respuesta del backend.
 * El backend envuelve las listas así:
 * { success, data: { data: [...], meta: {...} } }
 */
export function extractListMeta(response) {
  return response?.data?.data?.meta ?? null;
}

/**
 * Extrae un registro individual de una respuesta del backend.
 * El backend envuelve los registros así:
 * { success, data: { user: {...} } }
 */
export function extractRecordData(response, key) {
  return response?.data?.data?.[key] ?? null;
}

/**
 * Obtiene TODAS las páginas de un endpoint paginado y retorna la lista
 * completa. Necesario cuando el filtrado se hace en el cliente (tabs por
 * estado) y la paginación por defecto del backend (20) ocultaría registros.
 *
 * @param {(params: { page: number, limit: number }) => Promise} requestFn
 *   Función que ejecuta la petición y retorna la respuesta axios cruda.
 * @param {{ limit?: number }} [options] - Tamaño de página (máx. 100 según API).
 * @returns {Promise<Array>} Lista completa de registros.
 */
export async function fetchAllListPages(requestFn, { limit = 100 } = {}) {
  const firstResponse = await requestFn({ page: 1, limit });
  const firstData = extractListData(firstResponse);
  const meta = extractListMeta(firstResponse);

  if (!meta || meta.totalPages <= 1) {
    return firstData;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: meta.totalPages - 1 }, (_, index) => requestFn({ page: index + 2, limit }))
  );

  return [...firstData, ...remainingResponses.flatMap(extractListData)];
}
