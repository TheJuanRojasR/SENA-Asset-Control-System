import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { userRepository } from '../repositories/user.repository.js';

const reject = (res, message, code = 'UNAUTHORIZED') =>
  res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    message,
    code,
  });

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(res, 'No autorizado');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // AC-AUTH-04-4: un vencimiento normal no es un motivo para expulsar al usuario.
      // El cliente necesita el código para decidir si renueva la sesión en vez de
      // mandarlo a iniciar sesión de nuevo.
      if (error instanceof jwt.TokenExpiredError) {
        return reject(res, 'Token expirado', 'TOKEN_EXPIRED');
      }

      // Token falsificado, con otra clave o malformado: no hay nada que renovar.
      return reject(res, 'Token inválido');
    }

    // RN-USR-05: el estado de la cuenta se verifica en cada petición. Un token vigente
    // de una cuenta desactivada no da acceso, y el rol se lee de la base y no del token,
    // así que desactivar o cambiar de rol surte efecto sin esperar al vencimiento.
    // RN-AUTH-05: además, un token emitido antes del último cierre de sesión ya no vale,
    // aunque su firma sea correcta y no haya vencido.
    const user = await userRepository.findAuthSession(decoded.userId);
    if (!user || !user.isActive || (decoded.sv ?? 0) !== user.sessionVersion) {
      return reject(res, 'Sesión no válida');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
