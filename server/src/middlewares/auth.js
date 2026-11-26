import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'No autorizado',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    // AC-AUTH-04-4: un vencimiento normal no es un motivo para expulsar al usuario.
    // El cliente necesita el código para decidir si renueva la sesión en vez de
    // mandarlo a iniciar sesión de nuevo.
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Token falsificado, con otra clave o malformado: no hay nada que renovar.
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token inválido',
      code: 'UNAUTHORIZED',
    });
  }
};
