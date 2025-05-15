import { FastifyInstance } from 'fastify';
import {
  createPostController,
  getPostByIdController,
  getAllPostsController,
  scrapeFacebookGroupController,
  getAllPostsToFileController,
  updateAllProcessedContentController
} from './realEstate.controller.js';
import {
  CreatePostSchema,
  GetPostParamsSchema,
  GetPostsQuerySchema,
  ScrapeFacebookGroupSchema
} from './realEstate.schemas.js';

export async function realEstateRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/post/manualy-create-post',
    {
      schema: {
        summary: 'Create a post manually',
        body: CreatePostSchema,
        tags: ['RealEstate']
      }
    },
    createPostController
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
    getPostByIdController
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
    getAllPostsController
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
    scrapeFacebookGroupController
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
    getAllPostsToFileController
  );

  fastify.post(
    '/posts/update-processed-content',
    {
      schema: {
        summary: 'Update processed content for all posts',
        tags: ['RealEstate']
      }
    },
    updateAllProcessedContentController
  );
}
