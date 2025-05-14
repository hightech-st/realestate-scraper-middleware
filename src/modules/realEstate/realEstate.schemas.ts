import { Type } from '@sinclair/typebox';

export const CreatePostSchema = Type.Object({
  id: Type.String(),
  post_id: Type.String(),
  group_id: Type.Optional(Type.String()),
  source: Type.String(),
  postedAt: Type.String({ format: 'date-time' }),
  rawData: Type.Object({}),
  processed_content: Type.Optional(Type.String()),
  s3_image_links: Type.Optional(Type.Array(Type.String()))
});

export const GetPostParamsSchema = Type.Object({
  id: Type.String()
});

export const GetPostsQuerySchema = Type.Object({
  postedAtFrom: Type.Optional(Type.String({ format: 'date-time' })),
  postedAtTo: Type.Optional(Type.String({ format: 'date-time' }))
});

export const ScrapeFacebookGroupSchema = Type.Object({
  startUrls: Type.Array(
    Type.Object({
      url: Type.String()
    })
  ),
  resultsLimit: Type.Optional(Type.Number()),
  commentsLimit: Type.Optional(Type.Number()),
  reactionsLimit: Type.Optional(Type.Number()),
  proxyConfiguration: Type.Optional(
    Type.Object({
      useApifyProxy: Type.Boolean()
    })
  )
});

export const UpdateProcessingStatusSchema = Type.Object({
  is_content_processed: Type.Optional(Type.Boolean()),
  is_image_processed: Type.Optional(Type.Boolean()),
  processed_content: Type.Optional(Type.String()),
  s3_image_links: Type.Optional(Type.Array(Type.String()))
});
