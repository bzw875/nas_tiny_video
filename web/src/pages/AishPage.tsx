import { useEffect, useMemo, useState } from 'react';
import { getAishPosts, type AishPost } from '../api/treehole';
import { TreeholePager } from '../components/TreeholePager';
import { TreeholeTabs } from '../components/TreeholeTabs';
import { formatCount, timeAgo } from '../lib/format';

const AISH_BASE = 'https://www.aish123.vip';
const PAGE_SIZE = 40;

function aishHref(articleUrl: string): string {
  return /^https?:\/\//i.test(articleUrl) ? articleUrl : `${AISH_BASE}${articleUrl}`;
}

export function AishPage() {
  const [posts, setPosts] = useState<AishPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [area, setArea] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAishPosts()
      .then((result) => {
        if (!cancelled) setPosts(result.items ?? []);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setPosts([]);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const key = post.area?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }, [posts]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (area && (post.area ?? '') !== area) return false;
      if (!keyword) return true;
      return (
        post.title.toLowerCase().includes(keyword) ||
        (post.author ?? '').toLowerCase().includes(keyword) ||
        (post.lastReplier ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [area, posts, search]);

  useEffect(() => {
    setPage(0);
  }, [area, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="th-page">
      <header className="th-header">
        <h2>Aish 帖子</h2>
        <p className="th-subtitle">来自 aish123.vip 的树洞索引 · 按最后回复时间排序</p>
      </header>

      <TreeholeTabs />

      <div className="aish-filter-wrap">
        <div className="aish-filter-row">
          <button
            type="button"
            className={`aish-type-chip${area === null ? ' aish-type-chip--active' : ''}`}
            onClick={() => setArea(null)}
          >
            <span>全部</span>
            <span className="aish-type-count">{posts.length}</span>
          </button>
          {areas.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`aish-type-chip${area === item.name ? ' aish-type-chip--active' : ''}`}
              onClick={() => setArea(item.name)}
            >
              <span>{item.name}</span>
              <span className="aish-type-count">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="th-search-row">
        <input
          type="search"
          className="th-search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="过滤标题 / 作者 / 最后回复"
          aria-label="过滤 Aish 帖子"
        />
      </div>

      <div className="th-toolbar-info th-search-status" aria-live="polite">
        {loading ? (
          '加载中…'
        ) : (
          <>
            共 <b>{filtered.length.toLocaleString()}</b> 条
            {area ? <span className="th-filter-tag">{area}</span> : null}
            {search.trim() ? <span className="th-filter-tag">「{search.trim()}」</span> : null}
          </>
        )}
      </div>

      {loading ? (
        <div className="th-skeleton" aria-busy="true">
          <div className="th-skeleton-card" />
          <div className="th-skeleton-card" />
        </div>
      ) : error ? (
        <div className="th-error" role="alert">
          <p>Aish 数据加载失败：{error}</p>
          <button type="button" className="small-btn" onClick={() => setReloadToken((v) => v + 1)}>
            重试
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="th-empty">没有匹配的帖子，试试换个地区或关键词。</div>
      ) : (
        <div className="th-aish-list">
          {visible.map((post) => (
            <article className="th-aish-row" key={post.articleId}>
              <div className="th-aish-title-line">
                <a
                  className="th-aish-title"
                  href={aishHref(post.articleUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {post.title}
                </a>
                {post.area ? <span className="th-area-badge">{post.area}</span> : null}
                {post.isNewUserPost ? <span className="th-new-badge">新用户</span> : null}
              </div>
              <div className="th-aish-meta">
                <span className="th-aish-author">{post.author ?? '匿名'}</span>
                <span>#{post.articleId}</span>
                <span>👁 {formatCount(post.readCount)}</span>
                <span>💬 {formatCount(post.replyCount)}</span>
                <span className="th-aish-last">
                  最后回复 {post.lastReplier ?? '—'} · {timeAgo(post.lastReplyTime)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length > 0 ? (
        <TreeholePager
          page={current}
          size={PAGE_SIZE}
          total={filtered.length}
          onChange={setPage}
        />
      ) : null}
    </div>
  );
}
