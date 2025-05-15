import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { Static } from '@sinclair/typebox';
import {
  CreatePostSchema,
  ScrapeFacebookGroupSchema,
  GetPostsQuerySchema
} from './realEstate.schemas.js';
import { cleanUpText } from '../../utility/cleanUpText.js';

const prisma = new PrismaClient();

export async function createPostService(data: Static<typeof CreatePostSchema>) {
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

export async function createMultiplePostsService(
  dataArray: Static<typeof CreatePostSchema>[]
) {
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

export async function getPostByIdService(id: string) {
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

export async function getAllPostsService(
  query: Static<typeof GetPostsQuerySchema>
) {
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
    take: 1000
  });
}

export async function getAllPostsToFileService(
  query: Static<typeof GetPostsQuerySchema>
) {
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
    take: 1000
  });

  const validContents = posts
    .map((post) => post.processed_content)
    .filter((content) => content !== null && content !== undefined);

  const fileContent = validContents.join('\n');

  return {
    content: fileContent,
    filename: `posts_${new Date().toISOString()}.txt`,
    totalPosts: validContents.length
  };
}

export async function scrapeFacebookGroupService(
  data: Static<typeof ScrapeFacebookGroupSchema>
) {
  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured');
  }

  try {
    const startRun = await axios.post(
      `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${APIFY_API_TOKEN}`,
      data
    );

    const runId = startRun.data.data.id;
    console.log('Started run:', runId);

    let runStatus = null;
    let maxWait = 1200;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise((r) => setTimeout(r, 5000));
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

export async function updateAllProcessedContentService() {
  const posts = await prisma.realEstateItem.findMany({
    select: {
      id: true,
      rawData: true
    }
  });

  let updatedCount = 0;
  let errorCount = 0;

  for (const post of posts) {
    try {
      const processedContent = cleanUpText(
        (post.rawData as { text?: string })?.text || ''
      );

      await prisma.realEstateItem.update({
        where: { id: post.id },
        data: {
          processed_content: processedContent,
          is_content_processed: true
        }
      });

      updatedCount++;
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
      errorCount++;
    }
  }

  return {
    totalProcessed: posts.length,
    updatedCount,
    errorCount
  };
}
