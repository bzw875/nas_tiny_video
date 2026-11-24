import { apiGet } from './client';

/** Matches the camelCase column aliases in `Aish123Mapper.xml`. */
export type Aish123Thread = {
  tid: number;
  fid: number;
  title: string;
  url: string | null;
  typeName: string | null;
  isSticky: number;
  isDigest: number;
  isLocked: number;
  hasAttachment: number;
  hasImage: number;
  price: number;
  authorUid: number | null;
  authorName: string | null;
  authorUrl: string | null;
  createdAt: string | null;
  replyCount: number;
  viewCount: number;
  lastReplyUid: number | null;
  lastReplyName: string | null;
  lastReplyAt: string | null;
  rating: number | null;
  pageIndex: number | null;
  rawRowHtml: string | null;
  firstSeenAt: string | null;
  updatedAt: string | null;
};

export type Aish123ListResponse = {
  items: Aish123Thread[];
  total: number;
  skip: number;
  take: number;
};

export type ListAish123Params = {
  skip?: number;
  take?: number;
  fid?: number;
  typeName?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/** Sentinel for threads with empty / null {@code typeName}; backend maps to SQL filter. */
export const AISH123_TYPE_NONE = '__NONE__';

export type Aish123TypeStatRow = {
  typeName: string | null;
  count: number;
};

export type Aish123TypeStatsResponse = {
  total: number;
  items: Aish123TypeStatRow[];
};

export function getAish123TypeStats() {
  return apiGet<Aish123TypeStatsResponse>('/aish123/stats/by-type');
}

export function listAish123Threads(params: ListAish123Params = {}) {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.take != null) q.set('take', String(params.take));
  if (params.fid != null) q.set('fid', String(params.fid));
  if (params.typeName) q.set('typeName', params.typeName);
  if (params.search) q.set('search', params.search);
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const qs = q.toString();
  return apiGet<Aish123ListResponse>(qs ? `/aish123?${qs}` : '/aish123');
}
