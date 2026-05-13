import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { galleryFileUrl, listGallery, type GalleryItem } from '../api/gallery';
import { formatSize } from '../lib/format';

const PAGE_SIZE = 48;

const GALLERY_SORT_FIELDS = ['filename', 'modifiedTime', 'size'] as const;
type GallerySortField = (typeof GALLERY_SORT_FIELDS)[number];

function isSortField(s: string): s is GallerySortField {
  return (GALLERY_SORT_FIELDS as readonly string[]).includes(s);
}

const DEFAULT_FIRST_ORDER: Record<GallerySortField, 'asc' | 'desc'> = {
  filename: 'asc',
  modifiedTime: 'desc',
  size: 'desc',
};

export function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0);
  const sortParam = searchParams.get('sort');
  const orderParam = searchParams.get('order');

  const sortField = sortParam && isSortField(sortParam) ? sortParam : undefined;
  const sortOrder =
    orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const skip = page * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sf = sortField ?? 'modifiedTime';
      const so = sortOrder ?? DEFAULT_FIRST_ORDER[sf];
      const res = await listGallery({
        skip,
        take: PAGE_SIZE,
        sortBy: sf,
        sortOrder: so,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [skip, sortField, sortOrder]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  function goPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  function setSort(field: GallerySortField) {
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

  const effectiveSortField: GallerySortField = sortField ?? 'modifiedTime';
  const effectiveSortOrder: 'asc' | 'desc' =
    sortOrder ?? DEFAULT_FIRST_ORDER[effectiveSortField];

  function sortLabel(field: GallerySortField, text: string) {
    if (field !== effectiveSortField) return text;
    return `${text}${effectiveSortOrder === 'asc' ? ' ↑' : ' ↓'}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="panel gallery-panel">
        <h2 style={{ marginTop: 0 }}>图片浏览</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          仅从配置的目录<strong>单层</strong>读取图片文件（不递归子文件夹）；数据来源为磁盘，不写数据库。
        </p>
        <div className="gallery-toolbar toolbar">
          <button
            type="button"
            className={effectiveSortField === 'filename' ? 'primary' : ''}
            onClick={() => setSort('filename')}
          >
            {sortLabel('filename', '文件名')}
          </button>
          <button
            type="button"
            className={effectiveSortField === 'modifiedTime' ? 'primary' : ''}
            onClick={() => setSort('modifiedTime')}
          >
            {sortLabel('modifiedTime', '修改时间')}
          </button>
          <button
            type="button"
            className={effectiveSortField === 'size' ? 'primary' : ''}
            onClick={() => setSort('size')}
          >
            {sortLabel('size', '大小')}
          </button>
          <span className="muted">
            共 {total} 张{loading ? '，加载中…' : ''}
          </span>
        </div>
        {err && (
          <p className="muted" style={{ color: 'var(--danger)' }}>
            {err}
          </p>
        )}
        {!err && !loading && items.length === 0 && (
          <p className="muted">当前目录下没有可展示的图片。</p>
        )}
        <div className="gallery-grid">
          {items.map((it) => (
            <button
              key={it.filename}
              type="button"
              className="gallery-card"
              onClick={() => setLightbox(it.filename)}
              title={it.filename}
            >
              <img
                src={galleryFileUrl(it.filename)}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="gallery-card-meta">
                <span className="gallery-card-name">{it.filename}</span>
                <span className="muted">
                  {formatSize(String(it.size))} ·{' '}
                  {new Date(it.modifiedTime).toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="gallery-pagination">
          <button
            type="button"
            className="small-btn"
            disabled={page <= 0}
            onClick={() => goPage(page - 1)}
          >
            上一页
          </button>
          <span className="muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="small-btn"
            disabled={page + 1 >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            下一页
          </button>
        </div>
      </div>

      {lightbox && (
        <div
          className="gallery-lightbox-backdrop"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <div
            className="gallery-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label="预览"
          >
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="关闭"
            >
              ×
            </button>
            <img src={galleryFileUrl(lightbox)} alt="" />
            <div className="gallery-lightbox-caption muted">{lightbox}</div>
          </div>
        </div>
      )}
    </div>
  );
}
