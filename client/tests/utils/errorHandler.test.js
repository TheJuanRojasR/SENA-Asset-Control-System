import { describe, it, expect } from 'vitest';
import {
  parseApiError,
  getApiErrorMessage,
  API_ERROR_TYPES,
} from '../../src/utils/errorHandler.js';

describe('parseApiError', () => {
  it('detecta errores de red (sin respuesta del servidor)', () => {
    const networkError = { request: {}, message: 'Network Error' };

    const parsed = parseApiError(networkError);

    expect(parsed.type).toBe(API_ERROR_TYPES.NETWORK);
    expect(parsed.status).toBeNull();
    expect(parsed.message).toMatch(/conexión/i);
  });

  it('usa el mensaje del backend cuando está disponible', () => {
    const apiError = {
      response: {
        status: 409,
        data: { message: 'Stock insuficiente para Martillo', code: 'INSUFFICIENT_STOCK' },
      },
    };

    const parsed = parseApiError(apiError);

    expect(parsed.type).toBe(API_ERROR_TYPES.STOCK);
    expect(parsed.message).toBe('Stock insuficiente para Martillo');
    expect(parsed.code).toBe('INSUFFICIENT_STOCK');
    expect(parsed.status).toBe(409);
  });

  it('mapea 401 a error de autenticación', () => {
    const parsed = parseApiError({ response: { status: 401, data: {} } });

    expect(parsed.type).toBe(API_ERROR_TYPES.AUTH);
  });

  it('mapea 403 a error de permisos', () => {
    const parsed = parseApiError({ response: { status: 403, data: {} } });

    expect(parsed.type).toBe(API_ERROR_TYPES.FORBIDDEN);
  });

  it('mapea 404 a recurso no encontrado', () => {
    const parsed = parseApiError({ response: { status: 404, data: {} } });

    expect(parsed.type).toBe(API_ERROR_TYPES.NOT_FOUND);
  });

  it('mapea 409 sin código de stock a conflicto genérico', () => {
    const parsed = parseApiError({
      response: { status: 409, data: { code: 'INVALID_STATUS' } },
    });

    expect(parsed.type).toBe(API_ERROR_TYPES.CONFLICT);
  });

  it('mapea 400 y 422 a error de validación', () => {
    expect(parseApiError({ response: { status: 400, data: {} } }).type).toBe(
      API_ERROR_TYPES.VALIDATION
    );
    expect(parseApiError({ response: { status: 422, data: {} } }).type).toBe(
      API_ERROR_TYPES.VALIDATION
    );
  });

  it('mapea errores 5xx a error de servidor', () => {
    const parsed = parseApiError({ response: { status: 500, data: {} } });

    expect(parsed.type).toBe(API_ERROR_TYPES.SERVER);
  });

  it('usa el mensaje fallback cuando no hay mensaje del backend', () => {
    const parsed = parseApiError({ response: { status: 500, data: {} } }, 'Falló la operación');

    expect(parsed.message).toBe('Falló la operación');
  });

  it('maneja errores completamente desconocidos', () => {
    const parsed = parseApiError(new Error('boom'));

    expect(parsed.type).toBe(API_ERROR_TYPES.UNKNOWN);
    expect(parsed.message).toBeTruthy();
  });

  it('ignora mensajes de backend vacíos', () => {
    const parsed = parseApiError({ response: { status: 500, data: { message: '   ' } } });

    expect(parsed.message).not.toBe('   ');
  });
});

describe('getApiErrorMessage', () => {
  it('retorna solo el mensaje normalizado', () => {
    const message = getApiErrorMessage({
      response: { status: 400, data: { message: 'Datos inválidos' } },
    });

    expect(message).toBe('Datos inválidos');
  });
});
