import { authService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

export const authController = {
  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Inicio de sesión exitoso',
      HTTP_STATUS.OK
    );
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refresh(refreshToken);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Token renovado',
      HTTP_STATUS.OK
    );
  }),

  logout: asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    successResponse(res, null, 'Sesión cerrada', HTTP_STATUS.OK);
  }),

  me: asyncHandler(async (req, res) => {
    const result = await authService.me(req.user.userId);
    successResponse(res, result.user, 'Perfil obtenido');
  }),
};
