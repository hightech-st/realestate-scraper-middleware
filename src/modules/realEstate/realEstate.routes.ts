import { FastifyInstance } from 'fastify';
import { RealEstateController } from './realEstate.controller.js';
import { RealEstateService } from './realEstate.service.js';

export async function realEstateRoutes(fastify: FastifyInstance) {
  const service = new RealEstateService();
  const controller = new RealEstateController(service);

  fastify.post(
    '/post/manualy-create-post',
    {
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
      }
    },
    controller.createPost.bind(controller)
  );

  fastify.get(
    '/post/:id',
    {
      schema: {
        summary: 'Get post by id',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        tags: ['RealEstate']
      }
    },
    controller.getPostById.bind(controller)
  );

  fastify.get(
    '/posts',
    {
      schema: {
        summary: 'Get all posts',
        tags: ['RealEstate'],
        querystring: {
          type: 'object',
          properties: {
            postedAtFrom: { type: 'string', format: 'date-time' },
            postedAtTo: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    controller.getAllPosts.bind(controller)
  );

  fastify.post(
    '/scrape-facebook-group',
    {
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
          }
        },
        tags: ['RealEstate']
      }
    },
    controller.scrapeFacebookGroup.bind(controller)
  );

  fastify.patch(
    '/post/:id/processing-status',
    {
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
      }
    },
    controller.updateProcessingStatus.bind(controller)
  );
}
