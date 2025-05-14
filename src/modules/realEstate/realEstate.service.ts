import { PrismaClient } from '@prisma/client';

import {
  CreatePostSchema,
  UpdateProcessingStatusSchema,
  ScrapeFacebookGroupSchema,
  GetPostsQuerySchema
} from './realEstate.schemas.js';
import { Static } from '@sinclair/typebox';
const prisma = new PrismaClient();

export class RealEstateService {
  async createPost(data: Static<typeof CreatePostSchema>) {
    //only create post if it doesn't exist
    const existingPost = await prisma.realEstateItem.findUnique({
      where: { id: data.id }
    });

    if (existingPost) {
      console.log(`Post already exists: ${data.id}`);
      return existingPost;
    }

    return await prisma.realEstateItem.create({
      data: {
        ...data,
        postedAt: new Date(data.postedAt),
        s3_image_links: data.s3_image_links || []
      }
    });
  }

  async createMultiplePosts(dataArray: Static<typeof CreatePostSchema>[]) {
    try {
      await prisma.realEstateItem.createMany({
        data: dataArray.map((data) => ({
          ...data,
          postedAt: new Date(data.postedAt),
          s3_image_links: data.s3_image_links || []
        })),
        skipDuplicates: true
      });
    } catch (error) {
      console.error(`Error creating multiple posts: ${error}`);
      throw error;
    }
  }

  async getPostById(id: string) {
    const currentTime = new Date();
    return await prisma.realEstateItem.findMany({
      where: {
        id: id,
        postedAt: {
          lte: currentTime
        }
      }
    });
  }

  async getAllPosts(query: Static<typeof GetPostsQuerySchema>) {
    return await prisma.realEstateItem.findMany({
      orderBy: {
        postedAt: 'desc'
      },
      where: {
        postedAt: {
          gte: query.postedAtFrom ? new Date(query.postedAtFrom) : undefined,
          lte: query.postedAtTo ? new Date(query.postedAtTo) : undefined
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
  }

  async updateProcessingStatus(
    id: string,
    data: Static<typeof UpdateProcessingStatusSchema>
  ) {
    return await prisma.realEstateItem.update({
      where: { id },
      data: {
        ...(data.is_content_processed !== undefined && {
          is_content_processed: data.is_content_processed
        }),
        ...(data.is_image_processed !== undefined && {
          is_image_processed: data.is_image_processed
        }),
        ...(data.processed_content !== undefined && {
          processed_content: data.processed_content
        }),
        ...(data.s3_image_links !== undefined && {
          s3_image_links: data.s3_image_links
        })
      }
    });
  }

  async scrapeFacebookGroup(data: Static<typeof ScrapeFacebookGroupSchema>) {
    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const response = await fetch(
      'https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${APIFY_API_TOKEN}`
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      throw new Error(`Apify API responded with status: ${response.status}`);
    }

    return await response.json();
  }
}
