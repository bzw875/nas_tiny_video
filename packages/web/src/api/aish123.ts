import { apiGet } from './client';

/** Matches Spring `Map` JSON keys from `Aish123ServiceImpl`. */
export type Aish123Thread = {
  tid: number;
  fid: number;
  title: string;
  url: string | null;
  type_name: string | null;
  is_sticky: number;
  is_digest: number;
  is_locked: number;
  has_attachment: number;
  has_image: number;
  price: number;
  author_uid: number | null;
  author_name: string | null;
  author_url: string | null;
  created_at: string | null;
  reply_count: number;
  view_count: number;
  last_reply_uid: number | null;
  last_reply_name: string | null;
  last_reply_at: string | null;
  rating: number | null;
  page_index: number | null;
  raw_row_html: string | null;
  first_seen_at: string | null;
  updated_at: string | null;
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

/** Sentinel for threads with empty / null {@code type_name}; backend maps to SQL filter. */
export const AISH123_TYPE_NONE = '__NONE__';

export type Aish123TypeStatRow = {
  type_name: string | null;
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
