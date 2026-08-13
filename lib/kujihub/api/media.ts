import { api } from './client';

export type MediaVideo = {
  id: string;
  title: string;
  creator: string;
  description: string;
  videoId: string;
  duration?: string;
  published?: string;
  views?: string;
  isShort: boolean;
  thumbnail: string;
};

export type AnimeCategory = {
  id: string;
  name: string;
  query: string;
  imageUrl: string | null;
  accentColor: string;
};

type AnimeCategoryResponse = {
  items: AnimeCategory[];
};

type YouTubeSearchResponse = {
  query: string;
  effectiveQuery: string;
  page: number;
  items: MediaVideo[];
};

export const mediaApi = {
  getCategories: () =>
    api.get<AnimeCategoryResponse>('/api/media/anime-categories').then((r) => r.data.items),
  searchVideos: (query: string, page: number, limit = 18) =>
    api
      .get<YouTubeSearchResponse>('/api/media/youtube-search', {
        params: { query, page, limit },
      })
      .then((r) => r.data),
};
