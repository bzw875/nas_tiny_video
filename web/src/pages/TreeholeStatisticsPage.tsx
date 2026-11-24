import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTreeholeStatistics, type TreeholeStatistics } from '../api/treehole';
import { TreeholeTabs } from '../components/TreeholeTabs';

type SortKey = 'articlesPosted' | 'totalLikes' | 'totalDislikes' | 'commentsReceived';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'articlesPosted', label: '内容数' },
  { key: 'totalLikes', label: '喜欢' },
  { key: 'totalDislikes', label: '不喜欢' },
  { key: 'commentsReceived', label: '收到回复' },
];

export function TreeholeStatisticsPage() {
  const [items, setItems] = useState<TreeholeStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('totalLikes');
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getTreeholeStatistics()
      .then((result) => {
        if (!cancelled) setItems(result.items ?? []);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setItems([]);
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

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const delta = a[sortKey] - b[sortKey];
      if (delta !== 0) return ascending ? delta : -delta;
      return a.author.localeCompare(b.author, 'zh-Hans-CN');
    });
  }, [ascending, items, sortKey]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setAscending((value) => !value);
    } else {
      setSortKey(key);
      setAscending(false);
    }
  };

  const totalLikes = useMemo(
    () => items.reduce((sum, item) => sum + item.totalLikes, 0),
    [items],
  );

  return (
    <div className="th-page">
      <header className="th-header">
        <h2>作者统计</h2>
        <p className="th-subtitle">
          喜欢 / 不喜欢 / 收到回复累计超过 1000 的作者，共 {items.length} 位 · 总喜欢{' '}
          {totalLikes.toLocaleString()}
        </p>
      </header>

      <TreeholeTabs />

      {loading ? (
        <div className="th-skeleton" aria-busy="true">
          <div className="th-skeleton-card" />
        </div>
      ) : error ? (
        <div className="th-error" role="alert">
          <p>统计数据加载失败：{error}</p>
          <button type="button" className="small-btn" onClick={() => setReloadToken((v) => v + 1)}>
            重试
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="th-empty">暂无统计数据。</div>
      ) : (
        <div className="th-table-wrap">
          <table className="data th-table">
            <thead>
              <tr>
                <th className="th-rank-col">#</th>
                <th>作者</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="th-num-col">
                    <button
                      type="button"
                      className={`th-sort-link${sortKey === column.key ? ' active' : ''}`}
                      onClick={() => changeSort(column.key)}
                      title={`按${column.label}排序`}
                    >
                      {column.label}
                      {sortKey === column.key ? (ascending ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, index) => (
                <tr key={item.author}>
                  <td className={`th-rank${index < 3 ? ' top' : ''}`}>{index + 1}</td>
                  <td>
                    <Link
                      className="th-author-link"
                      to={`/treehole/author/${encodeURIComponent(item.author)}`}
                    >
                      {item.author}
                    </Link>
                  </td>
                  <td className="th-num">{item.articlesPosted.toLocaleString()}</td>
                  <td className="th-num th-likes">{item.totalLikes.toLocaleString()}</td>
                  <td className="th-num th-dislikes">{item.totalDislikes.toLocaleString()}</td>
                  <td className="th-num">{item.commentsReceived.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
