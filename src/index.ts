import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import AWS from 'aws-sdk';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import config from './config.js';

import { ensureTableExists } from './bootstrap.js';

const fastify = Fastify({ logger: true });

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

const dynamoDb = new AWS.DynamoDB(config.dynamoDB);

const docClient = new AWS.DynamoDB.DocumentClient({
  ...config.dynamoDB,
  convertEmptyValues: true
});

// ✅ Define routes
fastify.post('/item', {
  schema: {
    summary: 'Create an item',
    body: {
      type: 'object',
      required: ['id', 'postedAt'],
      properties: {
        id: { type: 'string' },
        postedAt: { type: 'string', format: 'date-time' } // ISO timestamp
      },
      additionalProperties: true
    },
    tags: ['RealEstate']
  },
  handler: async (request, reply) => {
    const body = request.body as object;

    const params = {
      TableName: 'realestate_table',
      Item: {
        ...body,
        createdAt: new Date().toISOString()
      }
    };

    try {
      await docClient.put(params).promise();
      reply.send({ message: 'Item inserted successfully', item: params.Item });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to insert item' });
    }
  }
});

fastify.get('/item/:id', {
  schema: {
    summary: 'Get item loosely',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: true
    },
    tags: ['RealEstate']
  },
  handler: async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentTime = new Date().toISOString();

    const params = {
      TableName: 'realestate_table',
      KeyConditionExpression: 'id = :id AND postedAt <= :currentTime',
      ExpressionAttributeValues: {
        ':id': id,
        ':currentTime': currentTime
      }
    };

    try {
      const result = await docClient.query(params).promise();
      if (result.Items && result.Items.length > 0) {
        reply.send(result.Items);
      } else {
        reply.code(404).send({ message: 'Item not found' });
      }
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch item' });
    }
  }
});

// ✅ Start server
const start = async () => {
  try {
    await ensureTableExists(dynamoDb, fastify);
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
