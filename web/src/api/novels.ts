import { apiGet, apiSend } from './client';
import type { NovelListItem, NovelPageResponse } from './types';

export async function getAllNovels() {
  return apiGet<NovelListItem[]>('/novels?page=1&limit=10000');
}

export async function getNovel(id: string, page: number) {
  return apiGet<NovelPageResponse>(`/novel/${id}?page=${page}`);
}

export async function deleteNovel(id: number) {
  return apiSend<{ affected: number }>(`/novel/${id}`, { method: 'DELETE' });
}

export async function updateNovelStarRating(id: number, starRating: number) {
  return apiSend(`/novel/${id}`, {
    method: 'POST',
    body: JSON.stringify({ starRating }),
  });
}
