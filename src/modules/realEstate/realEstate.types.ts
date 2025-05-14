export interface CreatePostDto {
  id: string;
  post_id: string;
  group_id?: string;
  source: string;
  postedAt: string;
  rawData: object;
  processed_content?: string;
  s3_image_links?: string[];
}

export interface UpdateProcessingStatusDto {
  is_content_processed?: boolean;
  is_image_processed?: boolean;
  processed_content?: string;
  s3_image_links?: string[];
}

export interface ScrapeFacebookGroupDto {
  startUrls: Array<{ url: string }>;
  resultsLimit?: number;
  commentsLimit?: number;
  reactionsLimit?: number;
  proxyConfiguration?: {
    useApifyProxy: boolean;
  };
}

export interface PostQueryDto {
  postedAtFrom?: string;
  postedAtTo?: string;
}
