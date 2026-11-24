import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TREEHOLE_FIELDS,
  TREEHOLE_LIKE_RANGES,
  TREEHOLE_PAGE_SIZES,
  listTreehole,
  type TreeholeField,
  type TreeholeList,
} from '../api/treehole';
import { TreeholeCard } from '../components/TreeholeCard';
import { TreeholePager } from '../components/TreeholePager';
import { TreeholeTabs } from '../components/TreeholeTabs';
import { buildTreeholeQuery, readTreeholeQuery, type TreeholeQueryState } from '../lib/treeholeQuery';

export function TreeholePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, size, field, sort, likeRange } = useMemo(
    () => readTreeholeQuery(searchParams),
    [searchParams],
  );
  const [data, setData] = useState<TreeholeList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / size)) : 1;

  const apply = useCallback(
    (patch: Partial<TreeholeQueryState>) => {
      const next: TreeholeQueryState = { page, size, field, sort, likeRange, ...patch };
      setSearchParams(buildTreeholeQuery(next), { replace: true });
    },
    [field, likeRange, page, setSearchParams, size, sort],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listTreehole({ page, size, field, sort, likeRange })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [field, likeRange, page, reloadToken, size, sort]);

  // 页码越界（例如手动改了 URL）时自动回到最后一页。
  useEffect(() => {
    if (!data || data.total === 0) return;
    if (page >= totalPages) {
      apply({ page: totalPages - 1 });
    }
  }, [apply, data, page, totalPages]);

  const goPage = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 0), Math.max(totalPages - 1, 0));
      if (clamped === page) return;
      apply({ page: clamped });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [apply, page, totalPages],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPage(page - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goPage(page + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPage, page]);

  const items = data?.items ?? [];

  return (
    <div className="th-page">
      <header className="th-header">
        <h2>树洞</h2>
        <p className="th-subtitle">煎蛋树洞浏览版 · 键盘 ← → 翻页</p>
      </header>

      <TreeholeTabs />

      <div className="th-toolbar">
        <div className="th-toolbar-info" aria-live="polite">
          {loading ? (
            '加载中…'
          ) : error ? (
            <span className="th-inline-error">加载失败</span>
          ) : (
            <>
              共 <b>{(data?.total ?? 0).toLocaleString()}</b> 条
              {likeRange ? (
                <span className="th-filter-tag">点赞 {likeRange}</span>
              ) : null}
            </>
          )}
        </div>
        <div className="th-toolbar-controls">
          <label className="th-control">
            排序
            <select
              className="th-select"
              value={field}
              onChange={(event) =>
                apply({ field: event.target.value as TreeholeField, page: 0 })
              }
            >
              {TREEHOLE_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="th-sort-btn"
            onClick={() => apply({ sort: sort === 'DESC' ? 'ASC' : 'DESC', page: 0 })}
            title={`当前${sort === 'DESC' ? '降序' : '升序'}，点击切换`}
          >
            {sort === 'DESC' ? '↓ 降序' : '↑ 升序'}
          </button>
          <label className="th-control">
            点赞
            <select
              className="th-select"
              value={likeRange}
              onChange={(event) => apply({ likeRange: event.target.value, page: 0 })}
            >
              {TREEHOLE_LIKE_RANGES.map((range) => (
                <option key={range.label} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
          <label className="th-control">
            每页
            <select
              className="th-select"
              value={size}
              onChange={(event) => apply({ size: Number(event.target.value), page: 0 })}
            >
              {TREEHOLE_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="th-skeleton" aria-busy="true" aria-label="正在加载">
          <div className="th-skeleton-card" />
          <div className="th-skeleton-card" />
          <div className="th-skeleton-card" />
        </div>
      ) : error ? (
        <div className="th-error" role="alert">
          <p>树洞数据加载失败：{error}</p>
          <button type="button" className="small-btn" onClick={() => setReloadToken((v) => v + 1)}>
            重试
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="th-empty">
          {likeRange
            ? `点赞数在 ${likeRange} 区间内暂无内容，试试放宽筛选。`
            : '暂无内容。'}
        </div>
      ) : (
        <div className="th-list">
          {items.map((comment) => (
            <TreeholeCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {!loading && !error && data && data.total > 0 ? (
        <TreeholePager page={page} size={size} total={data.total} onChange={goPage} />
      ) : null}
    </div>
  );
}
