import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchTreehole, type TreeholeList } from '../api/treehole';
import { TreeholeCard } from '../components/TreeholeCard';
import { TreeholePager } from '../components/TreeholePager';
import { TreeholeTabs } from '../components/TreeholeTabs';
import { parsePageParam } from '../lib/treeholeQuery';

const DEBOUNCE_MS = 400;

export function TreeholeSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = useMemo(() => searchParams.get('q')?.trim() ?? '', [searchParams]);
  const page = parsePageParam(searchParams.get('page'));
  const [input, setInput] = useState(keyword);
  const [data, setData] = useState<TreeholeList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // 地址栏变化（前进/后退）时同步输入框。
  useEffect(() => {
    setInput(keyword);
  }, [keyword]);

  // 输入防抖：只把 q 写回地址栏，页码重置。
  useEffect(() => {
    const next = input.trim();
    if (next === keyword) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (next) params.set('q', next);
      setSearchParams(params, { replace: true });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, keyword, setSearchParams]);

  useEffect(() => {
    if (!keyword) {
      setData(null);
      setLoading(false);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    searchTreehole(keyword, page)
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
  }, [keyword, page, reloadToken]);

  const goPage = useCallback(
    (target: number) => {
      const params = new URLSearchParams();
      if (keyword) params.set('q', keyword);
      if (target > 0) params.set('page', String(target));
      setSearchParams(params);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [keyword, setSearchParams],
  );

  const submitNow = (value: string) => {
    const params = new URLSearchParams();
    if (value.trim()) params.set('q', value.trim());
    setSearchParams(params);
  };

  const items = data?.items ?? [];

  return (
    <div className="th-page">
      <header className="th-header">
        <h2>搜索树洞</h2>
        <p className="th-subtitle">输入关键词，在全量树洞内容里查找。</p>
      </header>

      <TreeholeTabs />

      <div className="th-search-row">
        <input
          type="search"
          className="th-search-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitNow(input);
          }}
          placeholder="搜索关键词，例如：地铁、猫、工作…"
          aria-label="搜索树洞内容"
        />
        {input ? (
          <button
            type="button"
            className="small-btn"
            onClick={() => {
              setInput('');
              setSearchParams(new URLSearchParams());
            }}
          >
            清除
          </button>
        ) : null}
      </div>

      <div className="th-toolbar-info th-search-status" aria-live="polite">
        {loading ? (
          '搜索中…'
        ) : keyword && data ? (
          <>
            关键词 <b>{keyword}</b> · 共 <b>{data.total.toLocaleString()}</b> 条结果
          </>
        ) : (
          '输入关键词开始搜索'
        )}
      </div>

      {loading ? (
        <div className="th-skeleton" aria-busy="true">
          <div className="th-skeleton-card" />
          <div className="th-skeleton-card" />
        </div>
      ) : error ? (
        <div className="th-error" role="alert">
          <p>搜索失败：{error}</p>
          <button type="button" className="small-btn" onClick={() => setReloadToken((v) => v + 1)}>
            重试
          </button>
        </div>
      ) : !keyword ? (
        <div className="th-empty">输入关键词，快速查找树洞内容。</div>
      ) : items.length === 0 ? (
        <div className="th-empty">没有找到包含「{keyword}」的内容。</div>
      ) : (
        <div className="th-list">
          {items.map((comment) => (
            <TreeholeCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {!loading && !error && keyword && data && data.total > 0 ? (
        <TreeholePager page={page} size={data.size} total={data.total} onChange={goPage} />
      ) : null}
    </div>
  );
}
