import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { cleanUpText } from './utility/cleanUpText.js';

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

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

// ✅ Define routes
fastify.post('/post/manualy-create-post', {
  schema: {
    summary: 'Create a post manually',
    body: {
      type: 'object',
      required: ['id', 'post_id', 'postedAt', 'rawData', 'source'],
      properties: {
        id: { type: 'string' },
        post_id: { type: 'string' },
        group_id: { type: 'string' },
        source: { type: 'string' },
        postedAt: { type: 'string', format: 'date-time' },
        rawData: { type: 'object' },
        processed_content: { type: 'string' },
        s3_image_links: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    tags: ['RealEstate']
  },
  handler: async (request, reply) => {
    const body = request.body as {
      id: string;
      post_id: string;
      group_id?: string;
      source: string;
      postedAt: string;
      rawData: object;
      processed_content?: string;
      s3_image_links?: string[];
    };

    try {
      const item = await prisma.realEstateItem.create({
        data: {
          id: body.id,
          post_id: body.post_id,
          group_id: body.group_id,
          source: body.source,
          postedAt: new Date(body.postedAt),
          rawData: body.rawData,
          processed_content: body.processed_content,
          s3_image_links: body.s3_image_links || []
        }
      });
      reply.send({ message: 'Item inserted successfully', item });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to insert item' });
    }
  }
});

fastify.get('/post/:id', {
  schema: {
    summary: 'Get post by id',
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
    const currentTime = new Date();

    try {
      const items = await prisma.realEstateItem.findMany({
        where: {
          id: id,
          postedAt: {
            lte: currentTime
          }
        }
      });

      if (items.length > 0) {
        reply.send(items);
      } else {
        reply.code(404).send({ message: 'Item not found' });
      }
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch item' });
    }
  }
});

// endponst to get all posts
fastify.get('/posts', {
  schema: {
    summary: 'Get all posts',
    tags: ['RealEstate'],
    query: {
      type: 'object',
      properties: {
        postedAtFrom: { type: 'string', format: 'date-time' },
        postedAtTo: { type: 'string', format: 'date-time' }
      }
    }
  },
  handler: async (request, reply) => {
    const { postedAtFrom, postedAtTo } = request.query as {
      postedAtFrom: string;
      postedAtTo: string;
    };
    const posts = await prisma.realEstateItem.findMany({
      orderBy: {
        postedAt: 'desc'
      },
      where: {
        postedAt: {
          gte: postedAtFrom ? new Date(postedAtFrom) : undefined,
          lte: postedAtTo ? new Date(postedAtTo) : undefined
        }
      },
      select: {
        id: true,
        post_id: true,
        group_id: true,
        source: true,
        postedAt: true,
        processed_content: true
      },
      take: 500
    });
    reply.send(posts);
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

      // Save each item to PostgreSQL
      const savePromises = data.map(async (item: any) => {
        const groupId = item.facebookUrl.match(/\/groups\/(\d+)/)?.[1];
        const postId = item.url.match(/\/permalink\/(\d+)/)?.[1];

        if (!postId) {
          fastify.log.warn('Could not extract post ID from URL', {
            url: item.url
          });
          return null;
        }

        try {
          return await prisma.realEstateItem.create({
            data: {
              id: `${groupId || 'unknown'}_${postId}`,
              post_id: postId,
              group_id: groupId,
              source: 'facebook',
              postedAt: new Date(item.time || new Date()),
              rawData: item,
              processed_content: cleanUpText(item.text || ''),
              s3_image_links: [],
              is_content_processed: true,
              is_image_processed: false
            }
          });
        } catch (error) {
          fastify.log.error('Failed to save item', {
            error,
            itemId: `${groupId || 'unknown'}_${postId}`
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

// Add new endpoint to update processing status
fastify.patch('/post/:id/processing-status', {
  schema: {
    summary: 'Update post processing status',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    body: {
      type: 'object',
      properties: {
        is_content_processed: { type: 'boolean' },
        is_image_processed: { type: 'boolean' },
        processed_content: { type: 'string' },
        s3_image_links: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    tags: ['RealEstate']
  },
  handler: async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      is_content_processed?: boolean;
      is_image_processed?: boolean;
      processed_content?: string;
      s3_image_links?: string[];
    };

    try {
      const updatedItem = await prisma.realEstateItem.update({
        where: { id },
        data: {
          ...(body.is_content_processed !== undefined && {
            is_content_processed: body.is_content_processed
          }),
          ...(body.is_image_processed !== undefined && {
            is_image_processed: body.is_image_processed
          }),
          ...(body.processed_content !== undefined && {
            processed_content: body.processed_content
          }),
          ...(body.s3_image_links !== undefined && {
            s3_image_links: body.s3_image_links
          })
        }
      });
      reply.send({ message: 'Item updated successfully', item: updatedItem });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Failed to update item' });
    }
  }
});

// ✅ Start server
const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await prisma.$connect();
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
