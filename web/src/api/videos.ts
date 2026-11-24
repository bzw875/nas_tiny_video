import { apiGet, apiSend } from './client';
import type { FolderListing, Video, VideoListResponse } from './types';

export function listVideos(params: {
  skip?: number;
  take?: number;
  tagIds?: number[];
  pathPrefix?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** 逗号分隔扩展名，如 ".mp4,.mkv" */
  extensions?: string;
}) {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.take != null) q.set('take', String(params.take));
  if (params.pathPrefix) q.set('pathPrefix', params.pathPrefix);
  if (params.search) q.set('search', params.search);
  if (params.tagIds?.length) q.set('tagIds', params.tagIds.join(','));
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  if (params.extensions) q.set('extensions', params.extensions);
  const qs = q.toString();
  return apiGet<VideoListResponse>(`/videos${qs ? `?${qs}` : ''}`);
}

export function getFolderListing(parent: string) {
  const q = parent ? `?parent=${encodeURIComponent(parent)}` : '';
  return apiGet<FolderListing>(`/videos/folders${q}`);
}

export function updateVideoTags(videoId: number, tagIds: number[]) {
  return apiSend<Video>(`/videos/${videoId}/tags`, {
    method: 'PATCH',
    body: JSON.stringify({ tagIds }),
  });
}
