import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';

export const notificationRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, async () => {
    return { data: [] };
  });
};
