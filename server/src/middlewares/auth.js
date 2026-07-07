import { verifyAccessToken } from '../utils/jwt.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'No autorizado',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token inválido o expirado',
      code: 'UNAUTHORIZED',
    });
  }
};
