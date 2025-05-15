import { PrismaClient } from '@prisma/client';
import axios from 'axios';

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
        //skip post with duplicate id
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

  async getAllPostsToFile(query: Static<typeof GetPostsQuerySchema>) {
    const posts = await prisma.realEstateItem.findMany({
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
        processed_content: true
      },
      take: 500
    });

    // Filter out any posts with null/undefined processed_content
    const validContents = posts
      .map((post) => post.processed_content)
      .filter((content) => content !== null && content !== undefined);

    // Join all contents with newlines
    const fileContent = validContents.join('\n');

    return {
      content: fileContent,
      filename: `posts_${new Date().toISOString()}.txt`,
      totalPosts: validContents.length
    };
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

    try {
      // Step 1: Start actor run
      const startRun = await axios.post(
        `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${APIFY_API_TOKEN}`,
        data
      );

      const runId = startRun.data.data.id;
      console.log('Started run:', runId);

      // Step 2: Poll for run completion
      let runStatus = null;
      let maxWait = 1200; // Max 20 minutes
      let waited = 0;

      while (waited < maxWait) {
        await new Promise((r) => setTimeout(r, 5000)); // wait 5s
        waited += 5;

        const statusRes = await axios.get(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
        );

        runStatus = statusRes.data.data.status;
        console.log(`Status after ${waited}s:`, runStatus);

        if (runStatus === 'SUCCEEDED') {
          break;
        }

        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(runStatus)) {
          throw new Error(`Apify run failed: ${runStatus}`);
        }
      }

      if (runStatus !== 'SUCCEEDED') {
        throw new Error('Apify run did not finish in time.');
      }

      // Step 3: Get dataset items
      const datasetId = startRun.data.data.defaultDatasetId;
      const datasetRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
      );

      console.log('Scraped data:', datasetRes.data);
      return datasetRes.data;
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  }
}
