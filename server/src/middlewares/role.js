import { HTTP_STATUS } from '../constants/httpStatus.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'No autenticado',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};
