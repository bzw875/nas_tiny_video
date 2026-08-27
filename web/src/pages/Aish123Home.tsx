import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AISH123_TYPE_NONE,
  getAish123TypeStats,
  listAish123Threads,
} from '../api/aish123';
import type { Aish123Thread, Aish123TypeStatRow } from '../api/aish123';

const PAGE_SIZE = 40;

/** Preferred tab order (Shanghai districts + common tags); others sort by count. */
const TYPE_TAB_ORDER: string[] = [
  '普陀区',
  '徐汇区',
  '黄浦区',
  '长宁区',
  '静安区',
  '虹口区',
  '杨浦区',
  '闵行区',
  '宝山区',
  '浦东新区',
  '嘉定区',
  '松江区',
  '金山区',
  '青浦区',
  '奉贤区',
  '崇明区',
  '昆山市',
  '场所验证',
  '女生验证',
];

function formatCount(n: number) {
  if (n < 10000) return String(n);
  return `${(n / 10000).toFixed(1)}万`;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function typeTabRank(name: string | null): number {
  if (name == null || name === '') return 9999;
  const i = TYPE_TAB_ORDER.indexOf(name);
  return i >= 0 ? i : 1000;
}

function sortTypeBuckets(items: Aish123TypeStatRow[]): Aish123TypeStatRow[] {
  return [...items].sort((a, b) => {
    const ra = typeTabRank(a.type_name);
    const rb = typeTabRank(b.type_name);
    if (ra !== rb) return ra - rb;
    return b.count - a.count;
  });
}

function isGeoDistrict(name: string | null): boolean {
  if (name == null || name === '') return false;
  return name.endsWith('区') || name === '昆山市';
}

function filterKey(row: Aish123TypeStatRow): string {
  return row.type_name == null || row.type_name === '' ? AISH123_TYPE_NONE : row.type_name;
}

function filterLabel(row: Aish123TypeStatRow): string {
  return row.type_name == null || row.type_name === '' ? '未分类' : row.type_name;
}

export function Aish123Home() {
  const [items, setItems] = useState<Aish123Thread[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [fidInput, setFidInput] = useState('');
  const [fid, setFid] = useState<number | undefined>(undefined);
  const [typeStats, setTypeStats] = useState<Aish123TypeStatRow[]>([]);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getAish123TypeStats();
        if (cancelled) return;
        setTypeStats(sortTypeBuckets(res.items ?? []));
        setStatsTotal(res.total ?? 0);
        setStatsError(null);
      } catch (e) {
        if (cancelled) return;
        setTypeStats([]);
        setStatsTotal(0);
        setStatsError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { geoBuckets, otherBuckets } = useMemo(() => {
    const geo: Aish123TypeStatRow[] = [];
    const other: Aish123TypeStatRow[] = [];
    for (const row of typeStats) {
      if (isGeoDistrict(row.type_name)) geo.push(row);
      else other.push(row);
    }
    return { geoBuckets: geo, otherBuckets: other };
  }, [typeStats]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAish123Threads({
        skip,
        take: PAGE_SIZE,
        search: search.trim() || undefined,
        fid,
        typeName: selectedTypeKey ?? undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [skip, search, fid, selectedTypeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSkip(0);
  }, [search, fid, selectedTypeKey]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );
  const pageIndex = Math.floor(skip / PAGE_SIZE) + 1;
  const canPrev = skip > 0;
  const canNext = skip + items.length < total;

  const applyFid = () => {
    const s = fidInput.trim();
    if (!s) {
      setFid(undefined);
      return;
    }
    const n = Number(s);
    setFid(Number.isFinite(n) ? n : undefined);
  };

  const renderChip = (label: string, count: number, key: string | null, active: boolean) => (
    <button
      key={key ?? '__all__'}
      type="button"
      className={`aish-type-chip${active ? ' aish-type-chip--active' : ''}`}
      onClick={() => setSelectedTypeKey(key)}
    >
      <span>{label}</span>
      <span className="aish-type-count">{count}</span>
    </button>
  );

  return (
    <div className="panel novel-shell">
      <h2 style={{ marginTop: 0 }}>aish123 帖子</h2>
      <div className="aish-filter-wrap">
        <div className="aish-filter-row">
          {renderChip('全部', statsTotal, null, selectedTypeKey === null)}
          {geoBuckets.map((row) =>
            renderChip(filterLabel(row), row.count, filterKey(row), selectedTypeKey === filterKey(row)),
          )}
        </div>
        {otherBuckets.length > 0 ? (
          <div className="aish-filter-row">
            <span className="aish-filter-sep" aria-hidden />
            {otherBuckets.map((row) =>
              renderChip(filterLabel(row), row.count, filterKey(row), selectedTypeKey === filterKey(row)),
            )}
          </div>
        ) : null}
        {statsError ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            分区统计加载失败：{statsError}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="标题 / 作者 / 最后回复"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="novel-search"
          style={{ flex: '1 1 200px', marginBottom: 0 }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="版块 fid"
            value={fidInput}
            onChange={(e) => setFidInput(e.target.value)}
            className="novel-search"
            style={{ width: '120px', marginBottom: 0 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFid();
            }}
          />
          <button type="button" className="small-btn" onClick={applyFid}>
            筛选
          </button>
        </div>
      </div>
      <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {loading ? '加载中…' : `共 ${total} 条`}
        {error && (
          <span style={{ color: 'var(--danger, #c44)', marginLeft: '1rem' }}>{error}</span>
        )}
      </div>
      <div className="books-table">
        {items.map((row) => (
          <div className="novel-row" key={row.tid}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'baseline' }}>
              {row.url ? (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="novel-title-link"
                >
                  {row.title}
                </a>
              ) : (
                <span className="novel-title-link" style={{ cursor: 'default' }}>
                  {row.title}
                </span>
              )}
              {row.type_name ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  [{row.type_name}]
                </span>
              ) : null}
              {row.is_sticky ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>置顶</span>
              ) : null}
              {row.is_digest ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>精华</span>
              ) : null}
            </div>
            <div className="text-ellipsis" style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
              {row.author_url && row.author_name ? (
                <a href={row.author_url} target="_blank" rel="noopener noreferrer">
                  {row.author_name}
                </a>
              ) : (
                row.author_name ?? '—'
              )}
              <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>·</span>
              <span style={{ color: 'var(--text-muted)' }}>
                回 {row.reply_count} / 阅 {formatCount(row.view_count)}
              </span>
            </div>
            <div
              className="text-ellipsis"
              style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              最后回复{' '}
              {row.last_reply_name ?? '—'}
              {row.last_reply_at ? ` · ${formatTime(row.last_reply_at)}` : ''}
            </div>
          </div>
        ))}
      </div>
      {!loading && items.length === 0 && !error ? (
        <p style={{ color: 'var(--text-muted)' }}>暂无数据</p>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          className="small-btn"
          disabled={!canPrev || loading}
          onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
        >
          上一页
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          第 {pageIndex} / {totalPages} 页
        </span>
        <button
          type="button"
          className="small-btn"
          disabled={!canNext || loading}
          onClick={() => setSkip((s) => s + PAGE_SIZE)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
