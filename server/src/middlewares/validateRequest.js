import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({ ...req.body, ...req.params, ...req.query });
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors: messages,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateBody = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors: messages,
      });
    }
    next(error);
  }
};
