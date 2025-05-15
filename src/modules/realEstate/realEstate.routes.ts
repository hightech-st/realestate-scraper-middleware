import { FastifyInstance } from 'fastify';
import { RealEstateController } from './realEstate.controller.js';
import { RealEstateService } from './realEstate.service.js';
import {
  CreatePostSchema,
  GetPostParamsSchema,
  GetPostsQuerySchema,
  ScrapeFacebookGroupSchema,
  UpdateProcessingStatusSchema
} from './realEstate.schemas.js';

export async function realEstateRoutes(fastify: FastifyInstance) {
  const service = new RealEstateService();
  const controller = new RealEstateController(service);

  fastify.post(
    '/post/manualy-create-post',
    {
      schema: {
        summary: 'Create a post manually',
        body: CreatePostSchema,
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
        params: GetPostParamsSchema,
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
        querystring: GetPostsQuerySchema,
        tags: ['RealEstate']
      }
    },
    controller.getAllPosts.bind(controller)
  );

  fastify.post(
    '/scrape-facebook-group',
    {
      schema: {
        summary: 'Scrape Facebook group data and save to database',
        body: ScrapeFacebookGroupSchema,
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
        params: GetPostParamsSchema,
        body: UpdateProcessingStatusSchema,
        tags: ['RealEstate']
      }
    },
    controller.updateProcessingStatus.bind(controller)
  );

  fastify.get(
    '/posts/download',
    {
      schema: {
        summary: 'Download all posts as text file',
        querystring: GetPostsQuerySchema,
        tags: ['RealEstate']
      }
    },
    controller.getAllPostsToFile.bind(controller)
  );
}
