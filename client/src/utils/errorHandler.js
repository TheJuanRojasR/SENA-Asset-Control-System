/**
 * Utilidades para interpretar errores de la API de forma consistente.
 *
 * El backend responde errores con la forma:
 * { success: false, message: string, code?: string, errors?: unknown }
 *
 * Este módulo normaliza cualquier error (axios, red, desconocido) en un
 * objeto { type, message, code, status } seguro de mostrar en la UI.
 */

export const API_ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  VALIDATION: 'validation',
  STOCK: 'stock',
  SERVER: 'server',
  UNKNOWN: 'unknown',
};

/** Códigos de negocio emitidos por el backend relacionados con stock. */
const STOCK_ERROR_CODES = new Set(['INSUFFICIENT_STOCK', 'EMPTY_ITEMS', 'DUPLICATED_ITEMS']);

const DEFAULT_MESSAGES = {
  [API_ERROR_TYPES.NETWORK]:
    'No hay conexión con el servidor. Verifica tu red e inténtalo de nuevo.',
  [API_ERROR_TYPES.AUTH]: 'Tu sesión expiró. Inicia sesión nuevamente.',
  [API_ERROR_TYPES.FORBIDDEN]: 'No tienes permisos para realizar esta acción.',
  [API_ERROR_TYPES.NOT_FOUND]: 'El recurso solicitado no existe.',
  [API_ERROR_TYPES.CONFLICT]: 'La operación entra en conflicto con el estado actual.',
  [API_ERROR_TYPES.VALIDATION]: 'Los datos enviados no son válidos.',
  [API_ERROR_TYPES.STOCK]: 'No hay stock suficiente para completar la operación.',
  [API_ERROR_TYPES.SERVER]: 'Error interno del servidor. Inténtalo más tarde.',
  [API_ERROR_TYPES.UNKNOWN]: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
};

/**
 * Normaliza un error capturado en un bloque catch.
 *
 * @param {unknown} error - Error capturado (típicamente AxiosError).
 * @param {string} [fallbackMessage] - Mensaje a usar si no se puede inferir uno.
 * @returns {{ type: string, message: string, code: string|null, status: number|null }}
 */
export function parseApiError(error, fallbackMessage) {
  // Error de red: axios no recibió respuesta (servidor caído, sin internet, CORS).
  if (error?.request && !error?.response) {
    return {
      type: API_ERROR_TYPES.NETWORK,
      message: fallbackMessage || DEFAULT_MESSAGES[API_ERROR_TYPES.NETWORK],
      code: null,
      status: null,
    };
  }

  const status = error?.response?.status ?? null;
  const data = error?.response?.data ?? {};
  const backendMessage =
    typeof data.message === 'string' && data.message.trim() ? data.message : null;
  const code = typeof data.code === 'string' ? data.code : null;

  let type = API_ERROR_TYPES.UNKNOWN;
  if (code && STOCK_ERROR_CODES.has(code)) {
    type = API_ERROR_TYPES.STOCK;
  } else if (status === 401) {
    type = API_ERROR_TYPES.AUTH;
  } else if (status === 403) {
    type = API_ERROR_TYPES.FORBIDDEN;
  } else if (status === 404) {
    type = API_ERROR_TYPES.NOT_FOUND;
  } else if (status === 409) {
    type = API_ERROR_TYPES.CONFLICT;
  } else if (status === 400 || status === 422) {
    type = API_ERROR_TYPES.VALIDATION;
  } else if (status !== null && status >= 500) {
    type = API_ERROR_TYPES.SERVER;
  }

  return {
    type,
    message: backendMessage || fallbackMessage || DEFAULT_MESSAGES[type],
    code,
    status,
  };
}

/**
 * Atajo para obtener solo el mensaje amigable de un error.
 *
 * @param {unknown} error
 * @param {string} [fallbackMessage]
 * @returns {string}
 */
export function getApiErrorMessage(error, fallbackMessage) {
  return parseApiError(error, fallbackMessage).message;
}
