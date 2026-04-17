import { apiGet, apiSend } from './client';
import type { Tag } from './types';

export function listTags() {
  return apiGet<Tag[]>('/tags');
}

export function createTag(body: { name: string; description?: string }) {
  return apiSend<Tag>('/tags', { method: 'POST', body: JSON.stringify(body) });
}

export function updateTag(
  id: number,
  body: { name?: string; description?: string | null },
) {
  return apiSend<Tag>(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteTag(id: number) {
  return apiSend<{ ok: boolean }>(`/tags/${id}`, { method: 'DELETE' });
}
