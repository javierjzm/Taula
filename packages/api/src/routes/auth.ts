import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerSchema, loginSchema, googleAuthSchema, appleAuthSchema } from '@taula/shared';
import { AuthService } from '../services/auth.service';

export const authRoutes = async (fastify: FastifyInstance) => {
  const authService = new AuthService(fastify.prisma);

  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body);
    return reply.code(201).send(result);
  });

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    return reply.send(result);
  });

  fastify.post('/google', async (request, reply) => {
    const { idToken } = googleAuthSchema.parse(request.body);
    const result = await authService.loginWithGoogle(idToken);
    return reply.send(result);
  });

  fastify.post('/apple', async (request, reply) => {
    const body = appleAuthSchema.parse(request.body);
    const result = await authService.loginWithApple(body);
    return reply.send(result);
  });

  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    const result = await authService.refreshToken(refreshToken);
    return reply.send(result);
  });
};
