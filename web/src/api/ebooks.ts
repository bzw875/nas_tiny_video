import { apiGet, apiSend } from './client';
import type { Ebook, EbookListResponse } from './types';

export function listEbooks(params: {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.take != null) q.set('take', String(params.take));
  if (params.search) q.set('search', params.search);
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const qs = q.toString();
  return apiGet<EbookListResponse>(`/ebooks${qs ? `?${qs}` : ''}`);
}

export function getEbook(id: number) {
  return apiGet<Ebook>(`/ebooks/${id}`);
}

export function createEbook(body: {
  title: string;
  author: string;
  filePath: string;
  format: string;
  sizeBytes: number;
}) {
  return apiSend<{ affected: number }>('/ebooks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEbook(
  id: number,
  body: {
    title: string;
    author: string;
    filePath: string;
    format: string;
    sizeBytes: number;
  },
) {
  return apiSend<{ affected: number }>(`/ebooks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteEbook(id: number) {
  return apiSend<{ affected: number }>(`/ebooks/${id}`, {
    method: 'DELETE',
  });
}
