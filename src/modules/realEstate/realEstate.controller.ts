import { FastifyRequest, FastifyReply } from 'fastify';
import { Static } from '@sinclair/typebox';
import {
  CreatePostSchema,
  ScrapeFacebookGroupSchema,
  GetPostsQuerySchema
} from './realEstate.schemas.js';
import { cleanUpText } from '../../utility/cleanUpText.js';
import {
  createPostService,
  createMultiplePostsService,
  getPostByIdService,
  getAllPostsService,
  scrapeFacebookGroupService,
  getAllPostsToFileService,
  updateAllProcessedContentService
} from './realEstate.service.js';

export async function createPostController(
  request: FastifyRequest<{ Body: Static<typeof CreatePostSchema> }>,
  reply: FastifyReply
) {
  try {
    const item = await createPostService(request.body);
    reply.send({ message: 'Item inserted successfully', item });
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to insert item' });
  }
}

export async function getPostByIdController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const items = await getPostByIdService(request.params.id);

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

export async function getAllPostsController(
  request: FastifyRequest<{
    Querystring: Static<typeof GetPostsQuerySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const posts = await getAllPostsService(request.query);
    reply.send(posts);
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch posts' });
  }
}

export async function scrapeFacebookGroupController(
  request: FastifyRequest<{ Body: Static<typeof ScrapeFacebookGroupSchema> }>,
  reply: FastifyReply
) {
  try {
    const data = await scrapeFacebookGroupService(request.body);

    const postsToCreate = data
      .map((item: any) => {
        const groupId = item.facebookUrl.match(/\/groups\/(\d+)/)?.[1];
        const postId = item.url.match(/\/permalink\/(\d+)/)?.[1];

        if (!postId) {
          request.log.warn('Could not extract post ID from URL', {
            url: item.url
          });
          return null;
        }

        return {
          id: `${groupId || 'unknown'}_${postId}`,
          post_id: postId,
          group_id: groupId,
          source: 'facebook',
          postedAt: item.time || new Date().toISOString(),
          rawData: item,
          processed_content: cleanUpText(item.text || ''),
          s3_image_links: []
        };
      })
      .filter(
        (item: any): item is Static<typeof CreatePostSchema> => item !== null
      );

    await createMultiplePostsService(postsToCreate);

    reply.send({
      message: 'Data scraped and saved successfully'
    });
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to scrape and save data' });
  }
}

export async function getAllPostsToFileController(
  request: FastifyRequest<{
    Querystring: Static<typeof GetPostsQuerySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const result = await getAllPostsToFileService(request.query);

    reply
      .header('Content-Type', 'text/plain')
      .header(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`
      )
      .send(result.content);
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to generate posts file' });
  }
}

export async function updateAllProcessedContentController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await updateAllProcessedContentService();
    reply.send({
      message: 'Successfully updated processed content',
      ...result
    });
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to update processed content' });
  }
}
