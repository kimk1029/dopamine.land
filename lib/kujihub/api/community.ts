import { api } from './client';
import axios from 'axios';
import { getWebAuthSession } from '../auth/webAuth';
import type {
  CommunityFeedItem,
  CommunityOverview,
  CommunityPost,
  CommunityComment,
  CreatePostBody,
  UpdatePostBody,
  CreateFeedItemBody,
} from '../types/community';

function rethrowApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '커뮤니티 요청에 실패했습니다.';
    throw new Error(message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('커뮤니티 요청에 실패했습니다.');
}

function getWriteAuthPayload() {
  const session = getWebAuthSession();
  return {
    token: session?.token ?? '',
    webAuth: session
      ? {
          provider: session.provider,
          user: session.user,
          issuedAt: session.createdAt,
        }
      : null,
  };
}

export const communityApi = {
  getList: () => api.get<CommunityPost[]>('/api/community/posts').then((r) => r.data),
  getOne: (id: number) => api.get<CommunityPost>(`/api/community/posts/${id}`).then((r) => r.data),
  create: async (body: CreatePostBody) => {
    try {
      const { data } = await api.post<CommunityPost>('/api/community/posts', {
        ...body,
        ...getWriteAuthPayload(),
      });
      return data;
    } catch (error) {
      rethrowApiError(error);
    }
  },
  update: (id: number, body: UpdatePostBody) =>
    api
      .put<CommunityPost>(`/api/community/posts/${id}`, {
        ...body,
        ...getWriteAuthPayload(),
      })
      .then((r) => r.data)
      .catch(rethrowApiError),
  remove: (id: number) => api.delete(`/api/community/posts/${id}`).catch(rethrowApiError),
  getFeed: (limit = 30) =>
    api.get<CommunityFeedItem[]>('/api/community/feed', { params: { limit } }).then((r) => r.data),
  
  createFeedItem: async (body: CreateFeedItemBody) => {
    try {
      const { data } = await api.post<CommunityFeedItem>('/api/community/feed', {
        ...body,
        ...getWriteAuthPayload(),
      });
      return data;
    } catch (error) {
      rethrowApiError(error);
    }
  },

  uploadImage: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Failed to get canvas context'));
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as compressed JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  getOverview: (postsLimit = 8, feedLimit = 20) =>
    api
      .get<CommunityOverview>('/api/community/overview', { params: { postsLimit, feedLimit } })
      .then((r) => r.data),
  getComments: (postId: number) => 
    api.get<CommunityComment[]>(`/api/community/posts/${postId}/comments`).then((r) => r.data),
  createComment: async (postId: number, body: { content: string }) => {
    try {
      const { data } = await api.post<CommunityComment>(`/api/community/posts/${postId}/comments`, {
        ...body,
        ...getWriteAuthPayload(),
      });
      return data;
    } catch (error) {
      rethrowApiError(error);
    }
  },
};
