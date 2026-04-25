import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { listTags } from '../api/tags';
import { listVideos } from '../api/videos';
import type { Tag, Video } from '../api/types';
import { VideoTagsEditor } from '../components/VideoTagsEditor';
import { VIDEO_EXTENSIONS } from '../constants/videoExtensions';
import { formatDateTime, formatSize } from '../lib/format';
import { buildIinaWeblink } from '../lib/iina';

const ALLOWED_EXT_SET = new Set<string>(VIDEO_EXTENSIONS);

const PAGE_SIZE = 50;

const VIDEO_SORT_FIELDS = [
  'id',
  'filename',
  'path',
  'extension',
  'size',
  'createdTime',
  'modifiedTime',
  'videoKey',
  'tags',
] as const;

type VideoSortField = (typeof VIDEO_SORT_FIELDS)[number];

function isSortField(s: string): s is VideoSortField {
  return (VIDEO_SORT_FIELDS as readonly string[]).includes(s);
}

const DEFAULT_FIRST_ORDER: Record<VideoSortField, 'asc' | 'desc'> = {
  id: 'desc',
  filename: 'asc',
  path: 'asc',
  extension: 'asc',
  size: 'desc',
  createdTime: 'desc',
  modifiedTime: 'desc',
  videoKey: 'asc',
  tags: 'desc',
};

function parseTagIdsParam(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n));
}

function parseExtParam(raw: string | null): Set<string> {
  const s = new Set<string>();
  if (!raw?.trim()) return s;
  for (const part of raw.split(',')) {
    const t = part.trim().toLowerCase();
    const withDot = t.startsWith('.') ? t : `.${t}`;
    if (ALLOWED_EXT_SET.has(withDot)) s.add(withDot);
  }
  return s;
}

export function VideosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagParam = searchParams.get('tags');
  const qParam = searchParams.get('q') ?? '';
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0);
  const sortParam = searchParams.get('sort');
  const orderParam = searchParams.get('order');
  const extParam = searchParams.get('ext');

  const selectedTagIds = useMemo(() => parseTagIdsParam(tagParam), [tagParam]);

  const sortField = sortParam && isSortField(sortParam) ? sortParam : undefined;
  const sortOrder =
    orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

  const selectedExtensions = useMemo(() => parseExtParam(extParam), [extParam]);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(qParam);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const tagDialogRef = useRef<HTMLDialogElement>(null);

  const skip = page * PAGE_SIZE;

  const extensionsQuery =
    selectedExtensions.size > 0 ? [...selectedExtensions].sort().join(',') : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listVideos({
        skip,
        take: PAGE_SIZE,
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
        search: qParam.trim() || undefined,
        sortBy: sortField,
        sortOrder: sortField ? sortOrder ?? DEFAULT_FIRST_ORDER[sortField] : undefined,
        extensions: extensionsQuery,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [
    skip,
    selectedTagIds,
    qParam,
    sortField,
    sortOrder,
    extensionsQuery,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch(qParam);
  }, [qParam]);

  useEffect(() => {
    const el = tagDialogRef.current;
    if (!el) return;
    if (editVideo) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [editVideo]);

  useEffect(() => {
    listTags()
      .then(setAllTags)
      .catch(() => {
        /* 标签筛选仍可用 URL */
      });
  }, []);

  function setTagFilter(ids: number[]) {
    const next = new URLSearchParams(searchParams);
    if (ids.length) next.set('tags', ids.join(','));
    else next.delete('tags');
    next.set('page', '0');
    setSearchParams(next);
  }

  function toggleTag(id: number) {
    const set = new Set(selectedTagIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setTagFilter([...set].sort((a, b) => a - b));
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    const t = search.trim();
    if (t) next.set('q', t);
    else next.delete('q');
    next.set('page', '0');
    setSearchParams(next);
  }

  function goPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  function setSort(field: VideoSortField) {
    const next = new URLSearchParams(searchParams);
    next.set('page', '0');
    if (sortField === field) {
      const o = sortOrder ?? DEFAULT_FIRST_ORDER[field];
      next.set('sort', field);
      next.set('order', o === 'asc' ? 'desc' : 'asc');
    } else {
      next.set('sort', field);
      next.set('order', DEFAULT_FIRST_ORDER[field]);
    }
    setSearchParams(next);
  }

  function toggleExtension(ext: string) {
    const next = new URLSearchParams(searchParams);
    next.set('page', '0');
    const sel = new Set(selectedExtensions);
    if (sel.has(ext)) sel.delete(ext);
    else sel.add(ext);
    if (sel.size === 0) next.delete('ext');
    else next.set('ext', [...sel].sort().join(','));
    setSearchParams(next);
  }

  function clearExtensionFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('ext');
    next.set('page', '0');
    setSearchParams(next);
  }

  function sortMark(field: VideoSortField): string {
    if (sortField !== field) return '';
    const o = sortOrder ?? (sortField ? DEFAULT_FIRST_ORDER[sortField] : 'desc');
    return o === 'asc' ? ' ↑' : ' ↓';
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>全部视频</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          列表视图，表头可排序；格式筛选为「仅显示所选扩展名」（不选则不过滤）。与目录视图、标签管理共用同一数据库。
        </p>
        <form className="toolbar" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="搜索文件名或路径…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="primary">
            搜索
          </button>
          <span className="muted">
            共 {total} 条{loading ? '，加载中…' : ''}
          </span>
        </form>
        <div style={{ marginBottom: '0.75rem' }}>
          <div
            className="muted"
            style={{
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span>视频格式筛选（多选）</span>
            {selectedExtensions.size > 0 && (
              <button type="button" className="small-btn" onClick={clearExtensionFilter}>
                清除格式筛选
              </button>
            )}
          </div>
          <div className="ext-filter-grid">
            {VIDEO_EXTENSIONS.map((ext) => (
              <label key={ext} className="ext-filter-item">
                <input
                  type="checkbox"
                  checked={selectedExtensions.has(ext)}
                  onChange={() => toggleExtension(ext)}
                />
                {ext}
              </label>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div>
            <div className="muted" style={{ marginBottom: '0.35rem' }}>
              标签筛选
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {allTags.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.9rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {err && <div className="panel err">{err}</div>}

      <div className="panel video-table-wrap">
        <table className="data video-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('id')}>
                  ID{sortMark('id')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('filename')}>
                  文件名{sortMark('filename')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('path')}>
                  路径{sortMark('path')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('extension')}>
                  扩展名{sortMark('extension')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('size')}>
                  大小{sortMark('size')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('createdTime')}>
                  创建时间{sortMark('createdTime')}
                </button>
              </th>
              <th>
                <button type="button" className="th-sort" onClick={() => setSort('modifiedTime')}>
                  修改时间{sortMark('modifiedTime')}
                </button>
              </th>
              <th title="按标签数量排序">
                <button type="button" className="th-sort" onClick={() => setSort('tags')}>
                  标签{sortMark('tags')}
                </button>
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="muted" style={{ textAlign: 'center', padding: '1.25rem' }}>
                  暂无数据
                </td>
              </tr>
            )}
            {items.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td className="cell-filename" title={v.filename}>
                  <a
                    className="filename-link-btn"
                    href={buildIinaWeblink(v.path)}
                    title="点击用 IINA 播放"
                  >
                    {v.filename}
                  </a>
                </td>
                <td className="cell-path" title={v.path}>
                  {v.path}
                </td>
                <td>{v.extension ?? '—'}</td>
                <td>{formatSize(v.size)}</td>
                <td>{formatDateTime(v.createdTime)}</td>
                <td>{formatDateTime(v.modifiedTime)}</td>
                <td>
                  {v.tags.length === 0 && <span className="muted">无</span>}
                  {v.tags.map((t) => (
                    <span key={t.id} className="tag-chip">
                      {t.name}
                    </span>
                  ))}
                </td>
                <td>
                  <button type="button" onClick={() => setEditVideo(v)}>
                    编辑标签
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={tagDialogRef}
        className="tag-dialog"
        onCancel={(e) => {
          e.preventDefault();
          setEditVideo(null);
        }}
      >
        {editVideo && (
          <VideoTagsEditor
            video={editVideo}
            onUpdated={(nv) => {
              setItems((prev) => prev.map((x) => (x.id === nv.id ? nv : x)));
            }}
            onClose={() => setEditVideo(null)}
          />
        )}
      </dialog>

      {total > PAGE_SIZE && (
        <div className="panel toolbar" style={{ justifyContent: 'space-between' }}>
          <button type="button" disabled={page <= 0 || loading} onClick={() => goPage(page - 1)}>
            上一页
          </button>
          <span className="muted">
            第 {page + 1} / {totalPages} 页
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => goPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
