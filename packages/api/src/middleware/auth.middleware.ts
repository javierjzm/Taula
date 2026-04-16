import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

export const authenticate = async (
  request: FastifyRequest,
  _reply: FastifyReply,
) => {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Token de autenticación requerido');
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'user') throw new AppError(401, 'Token inválido');
    request.userId = payload.sub;
  } catch {
    throw new AppError(401, 'Token inválido o expirado');
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    restaurantId: string;
  }
}
