import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';

export const meRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    return { data: user };
  });

  fastify.patch('/', { preHandler: [authenticate] }, async (request) => {
    const body = z
      .object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().optional(),
        preferredLang: z.enum(['ca', 'es', 'en', 'fr']).optional(),
      })
      .parse(request.body);

    const user = await fastify.prisma.user.update({
      where: { id: request.userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    return { data: user };
  });

  fastify.delete('/', { preHandler: [authenticate] }, async (request, reply) => {
    await fastify.prisma.user.delete({ where: { id: request.userId } });
    return reply.code(204).send();
  });

  fastify.post('/push-token', { preHandler: [authenticate] }, async (request) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    await fastify.prisma.user.update({
      where: { id: request.userId },
      data: { pushToken: token },
    });
    return { message: 'Token registrado' };
  });
};
