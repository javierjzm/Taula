import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export const corsPlugin = fp(async (fastify) => {
  fastify.register(cors, {
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://backoffice.taula.ad', 'https://taula.ad']
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });
});
