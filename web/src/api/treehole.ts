import { apiGet } from './client';

/** 树洞评论。id / postId / userId 是 MySQL BIGINT，后端按 nas 约定序列化成字符串。 */
export type TreeholeComment = {
  id: string;
  postId: string | null;
  author: string;
  authorType: number | null;
  dateGmt: string | null;
  userId: string | null;
  content: string;
  votePositive: number;
  voteNegative: number;
  subCommentCount: number;
  images: string | null;
  ipLocation: string | null;
  avatarRef: string | null;
  avatarType: number | null;
  authorMembership: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TreeholeList = {
  items: TreeholeComment[];
  total: number;
  page: number;
  size: number;
  field?: TreeholeField;
  sort?: TreeholeSort;
  likeRange?: string;
};

export type TreeholeStatistics = {
  author: string;
  totalLikes: number;
  totalDislikes: number;
  commentsReceived: number;
  articlesPosted: number;
};

export type AishPost = {
  title: string;
  articleUrl: string;
  articleId: string;
  area: string | null;
  isNewUserPost: boolean | null;
  author: string | null;
  publishTime: string | null;
  replyCount: number;
  readCount: number;
  lastReplier: string | null;
  lastReplyTime: string | null;
};

export const TREEHOLE_FIELDS = [
  { value: 'date_gmt', label: '日期' },
  { value: 'vote_positive', label: '喜欢' },
  { value: 'vote_negative', label: '不喜欢' },
  { value: 'sub_comment_count', label: '评论' },
] as const;

export type TreeholeField = (typeof TREEHOLE_FIELDS)[number]['value'];
export type TreeholeSort = 'ASC' | 'DESC';

export const TREEHOLE_LIKE_RANGES = [
  { value: '', label: '不限' },
  { value: '0-25', label: '0-25' },
  { value: '26-50', label: '26-50' },
  { value: '51-100', label: '51-100' },
  { value: '101-200', label: '101-200' },
  { value: '201-400', label: '201-400' },
  { value: '401-∞', label: '401+' },
] as const;

export const TREEHOLE_PAGE_SIZES = [10, 20, 50, 100] as const;
export const TREEHOLE_DEFAULT_SIZE = 20;

const FIELD_VALUES = new Set<string>(TREEHOLE_FIELDS.map((field) => field.value));
const RANGE_VALUES = new Set<string>(TREEHOLE_LIKE_RANGES.map((range) => range.value));

export function isTreeholeField(value: string | null): value is TreeholeField {
  return value != null && FIELD_VALUES.has(value);
}

export function isTreeholeLikeRange(value: string | null): boolean {
  return value != null && RANGE_VALUES.has(value);
}

export function isTreeholePageSize(value: number): boolean {
  return (TREEHOLE_PAGE_SIZES as readonly number[]).includes(value);
}

export type ListTreeholeParams = {
  page?: number;
  size?: number;
  field?: TreeholeField;
  sort?: TreeholeSort;
  likeRange?: string;
};

export function listTreehole(params: ListTreeholeParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? TREEHOLE_DEFAULT_SIZE),
    field: params.field ?? 'date_gmt',
    sort: params.sort ?? 'DESC',
    likeRange: params.likeRange ?? '',
  });
  return apiGet<TreeholeList>(`/treehole?${query}`);
}

export function listTreeholeByAuthor(author: string, page = 0, size = TREEHOLE_DEFAULT_SIZE) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<TreeholeList>(
    `/treehole/author/${encodeURIComponent(author)}?${query}`,
  );
}

export function searchTreehole(keyword: string, page = 0, size = TREEHOLE_DEFAULT_SIZE) {
  const query = new URLSearchParams({ q: keyword, page: String(page), size: String(size) });
  return apiGet<TreeholeList>(`/treehole/search?${query}`);
}

export function getTreeholeStatistics() {
  return apiGet<{ items: TreeholeStatistics[]; total: number }>('/treehole/statistics');
}

export function getAishPosts() {
  return apiGet<{ items: AishPost[]; total: number }>('/aish/posts');
}
