import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { realEstateRoutes } from './modules/realEstate/index.js';

const fastify = Fastify({ logger: true });

// Register Swagger
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'RealEstate Middleware API',
      version: '1.0.0'
    }
  }
});

await fastify.register(swaggerUI, {
  routePrefix: '/docs',
  staticCSP: false
});

// Register routes
await fastify.register(realEstateRoutes);

// Start server
const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
