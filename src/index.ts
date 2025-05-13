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

fastify.post('/scrape-facebook-group', {
  schema: {
    summary: 'Scrape Facebook group data and save to database',
    body: {
      type: 'object',
      required: ['startUrls'],
      properties: {
        startUrls: {
          type: 'array',
          items: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string' }
            }
          }
        },
        resultsLimit: { type: 'number' },
        commentsLimit: { type: 'number' },
        reactionsLimit: { type: 'number' },
        proxyConfiguration: {
          type: 'object',
          properties: {
            useApifyProxy: { type: 'boolean' }
          }
        }
      },
      additionalProperties: true
    },
    tags: ['RealEstate']
  },
  handler: async (request, reply) => {
    const body = request.body as any;
    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

    if (!APIFY_API_TOKEN) {
      reply.status(500).send({ error: 'APIFY_API_TOKEN not configured' });
      return;
    }

    try {
      const response = await fetch(
        'https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${APIFY_API_TOKEN}`
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        throw new Error(`Apify API responded with status: ${response.status}`);
      }

      const data = await response.json();

      console.log('data', data);

      // Save each item to DynamoDB
      const savePromises = data.map(async (item: any) => {
        // Extract group ID from facebookUrl
        const groupId = item.facebookUrl.match(/\/groups\/(\d+)/)?.[1];

        // Extract post ID from url
        const postId = item.url.match(/\/permalink\/(\d+)/)?.[1];

        if (!groupId || !postId) {
          fastify.log.warn('Could not extract group ID or post ID from URLs', {
            facebookUrl: item.facebookUrl,
            url: item.url
          });
          return null;
        }

        // Clean up the data structure
        const cleanedItem = {
          id: `${groupId}_${postId}`,
          postedAt: item.time || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          source: 'facebook_group',
          // Essential fields
          text: item.text,
          url: item.url,
          facebookUrl: item.facebookUrl,
          groupTitle: item.groupTitle,
          facebookId: item.facebookId,
          // User info
          user: {
            id: item.user?.id,
            name: item.user?.name
          },
          // Counts
          likesCount: item.likesCount || 0,
          sharesCount: item.sharesCount || 0,
          commentsCount: item.commentsCount || 0,
          // Comments (limit to first 5 to reduce size)
          topComments: (item.topComments || [])
            .slice(0, 5)
            .map((comment: any) => ({
              id: comment.id,
              text: comment.text,
              time: comment.time,
              user: {
                id: comment.user?.id,
                name: comment.user?.name
              }
            })),
          // Attachments (limit to essential info)
          attachments: (item.attachments || []).map((attachment: any) => ({
            type: attachment.type,
            url: attachment.url
          }))
        };

        const params = {
          TableName: 'realestate_table',
          Item: cleanedItem
        };

        try {
          return await docClient.put(params).promise();
        } catch (error) {
          fastify.log.error('Failed to save item', {
            error,
            itemId: cleanedItem.id
          });
          return null;
        }
      });

      const results = await Promise.all(savePromises);
      const successfulSaves = results.filter((result) => result !== null);

      reply.send({
        message: 'Data scraped and saved successfully',
        count: successfulSaves.length
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to scrape and save data' });
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
