import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  if (err.code === 'P2002') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message: 'Ya existe un registro con esos datos',
      code: 'DUPLICATED_RECORD',
    });
  }

  if (err.code === 'P2025') {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Recurso no encontrado',
      code: 'NOT_FOUND',
    });
  }

  console.error('Error no controlado:', err);

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    code: 'INTERNAL_ERROR',
  });
};
