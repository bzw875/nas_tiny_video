import { API_BASE, apiGet } from './client';

export type GalleryItem = {
  filename: string;
  size: number;
  modifiedTime: number;
};

export type GalleryListResponse = {
  items: GalleryItem[];
  total: number;
  skip: number;
  take: number;
};

export function listGallery(params: {
  skip?: number;
  take?: number;
  sortBy?: 'filename' | 'modifiedTime' | 'size';
  sortOrder?: 'asc' | 'desc';
}) {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.take != null) q.set('take', String(params.take));
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const qs = q.toString();
  return apiGet<GalleryListResponse>(`/gallery${qs ? `?${qs}` : ''}`);
}

export function galleryFileUrl(filename: string): string {
  const q = new URLSearchParams({ name: filename });
  return `${API_BASE}/gallery/file?${q}`;
}
