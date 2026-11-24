import {
  TREEHOLE_DEFAULT_SIZE,
  isTreeholeField,
  isTreeholeLikeRange,
  isTreeholePageSize,
  type TreeholeField,
  type TreeholeSort,
} from '../api/treehole';

export type TreeholeQueryState = {
  page: number;
  size: number;
  field: TreeholeField;
  sort: TreeholeSort;
  likeRange: string;
};

export function parsePageParam(value: string | null): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page <= 0) return 0;
  return Math.floor(page);
}

export function parseSizeParam(value: string | null): number {
  const size = Number(value);
  return Number.isFinite(size) && isTreeholePageSize(size) ? size : TREEHOLE_DEFAULT_SIZE;
}

export function parseFieldParam(value: string | null): TreeholeField {
  return isTreeholeField(value) ? value : 'date_gmt';
}

export function parseSortParam(value: string | null): TreeholeSort {
  return value === 'ASC' ? 'ASC' : 'DESC';
}

export function parseRangeParam(value: string | null): string {
  return value != null && isTreeholeLikeRange(value) ? value : '';
}

export function readTreeholeQuery(params: URLSearchParams): TreeholeQueryState {
  return {
    page: parsePageParam(params.get('page')),
    size: parseSizeParam(params.get('size')),
    field: parseFieldParam(params.get('field')),
    sort: parseSortParam(params.get('sort')),
    likeRange: parseRangeParam(params.get('likeRange')),
  };
}

/** 默认值不写进 URL，保持地址简洁。 */
export function buildTreeholeQuery(state: TreeholeQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page > 0) params.set('page', String(state.page));
  if (state.size !== TREEHOLE_DEFAULT_SIZE) params.set('size', String(state.size));
  if (state.field !== 'date_gmt') params.set('field', state.field);
  if (state.sort !== 'DESC') params.set('sort', state.sort);
  if (state.likeRange) params.set('likeRange', state.likeRange);
  return params;
}
