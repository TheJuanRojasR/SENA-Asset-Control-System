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
