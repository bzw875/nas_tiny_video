import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { listTreeholeByAuthor, type TreeholeList } from '../api/treehole';
import { TreeholeCard } from '../components/TreeholeCard';
import { TreeholePager } from '../components/TreeholePager';
import { TreeholeTabs } from '../components/TreeholeTabs';
import { parsePageParam } from '../lib/treeholeQuery';

export function TreeholeAuthorPage() {
  const { author = '' } = useParams<{ author: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));
  const [data, setData] = useState<TreeholeList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!author) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    listTreeholeByAuthor(author, page)
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
  }, [author, page, reloadToken]);

  const goPage = useCallback(
    (target: number) => {
      const next = new URLSearchParams();
      if (target > 0) next.set('page', String(target));
      setSearchParams(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams],
  );

  const items = data?.items ?? [];

  return (
    <div className="th-page">
      <header className="th-header">
        <Link className="th-back" to="/treehole">
          ← 返回树洞
        </Link>
        <h2 className="th-author-title">{author || '未知作者'}</h2>
        <p className="th-subtitle">
          {loading ? '加载中…' : `共 ${(data?.total ?? 0).toLocaleString()} 条动态 · 最新在前`}
        </p>
      </header>

      <TreeholeTabs />

      {loading ? (
        <div className="th-skeleton" aria-busy="true" aria-label="正在加载">
          <div className="th-skeleton-card" />
          <div className="th-skeleton-card" />
        </div>
      ) : error ? (
        <div className="th-error" role="alert">
          <p>该作者内容加载失败：{error}</p>
          <button type="button" className="small-btn" onClick={() => setReloadToken((v) => v + 1)}>
            重试
          </button>
        </div>
      ) : !author ? (
        <div className="th-empty">未指定作者。</div>
      ) : items.length === 0 ? (
        <div className="th-empty">这个作者还没有树洞内容。</div>
      ) : (
        <div className="th-list">
          {items.map((comment) => (
            <TreeholeCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {!loading && !error && data && data.total > 0 ? (
        <TreeholePager page={page} size={data.size} total={data.total} onChange={goPage} />
      ) : null}
    </div>
  );
}
