export interface CommunityPost {
  id: number;
  category: string;
  isNotice?: boolean;
  title: string;
  content: string;
  author: string;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface CommunityFeedItem {
  id: number;
  type: string;
  source: string;
  title: string;
  body: string;
  author?: string | null;
  imageUrl?: string | null;
  link?: string | null;
  postId?: number | null;
  createdAt: string;
}

export interface CreateFeedItemBody {
  type?: string;
  title: string;
  body?: string;
  imageUrl?: string;
}

export interface CommunityOverview {
  posts: CommunityPost[];
  feed: CommunityFeedItem[];
  stats: {
    postCount: number;
    feedCount: number;
    latestPostAt: string | null;
    latestFeedAt: string | null;
  };
}

export interface CreatePostBody {
  title: string;
  content?: string;
  author?: string;
  category?: string;
  isNotice?: boolean;
}

export interface UpdatePostBody {
  title?: string;
  content?: string;
  author?: string;
  category?: string;
  isNotice?: boolean;
}
