import { FastifyRequest, FastifyReply } from 'fastify';
import { RealEstateService } from './realEstate.service.js';
import { cleanUpText } from '../../utility/cleanUpText.js';
import { Static } from '@sinclair/typebox';
import {
  CreatePostSchema,
  UpdateProcessingStatusSchema,
  ScrapeFacebookGroupSchema,
  GetPostsQuerySchema
} from './realEstate.schemas.js';

export class RealEstateController {
  constructor(private readonly service: RealEstateService) {}

  async createPost(
    request: FastifyRequest<{ Body: Static<typeof CreatePostSchema> }>,
    reply: FastifyReply
  ) {
    try {
      const item = await this.service.createPost(request.body);
      reply.send({ message: 'Item inserted successfully', item });
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({ error: 'Failed to insert item' });
    }
  }

  async getPostById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const items = await this.service.getPostById(request.params.id);

      if (items.length > 0) {
        reply.send(items);
      } else {
        reply.code(404).send({ message: 'Item not found' });
      }
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch item' });
    }
  }

  async getAllPosts(
    request: FastifyRequest<{
      Querystring: Static<typeof GetPostsQuerySchema>;
    }>,
    reply: FastifyReply
  ) {
    try {
      const posts = await this.service.getAllPosts(request.query);
      reply.send(posts);
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({ error: 'Failed to fetch posts' });
    }
  }

  async updateProcessingStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: Static<typeof UpdateProcessingStatusSchema>;
    }>,
    reply: FastifyReply
  ) {
    try {
      const updatedItem = await this.service.updateProcessingStatus(
        request.params.id,
        request.body
      );
      reply.send({ message: 'Item updated successfully', item: updatedItem });
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({ error: 'Failed to update item' });
    }
  }

  async scrapeFacebookGroup(
    request: FastifyRequest<{ Body: Static<typeof ScrapeFacebookGroupSchema> }>,
    reply: FastifyReply
  ) {
    try {
      const data = await this.service.scrapeFacebookGroup(request.body);

      const savePromises = data.map(async (item: any) => {
        const groupId = item.facebookUrl.match(/\/groups\/(\d+)/)?.[1];
        const postId = item.url.match(/\/permalink\/(\d+)/)?.[1];

        if (!postId) {
          request.log.warn('Could not extract post ID from URL', {
            url: item.url
          });
          return null;
        }

        try {
          return await this.service.createPost({
            id: `${groupId || 'unknown'}_${postId}`,
            post_id: postId,
            group_id: groupId,
            source: 'facebook',
            postedAt: item.time || new Date().toISOString(),
            rawData: item,
            processed_content: cleanUpText(item.text || ''),
            s3_image_links: []
          });
        } catch (error) {
          request.log.error('Failed to save item', {
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
      request.log.error(err);
      reply.status(500).send({ error: 'Failed to scrape and save data' });
    }
  }
}
