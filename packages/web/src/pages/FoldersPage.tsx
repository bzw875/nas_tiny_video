import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFolderListing } from '../api/videos';
import type { FolderListing } from '../api/types';

function joinParent(current: string, segment: string): string {
  if (current === '') return `/${segment}/`;
  const base = current.endsWith('/') ? current : `${current}/`;
  return `${base}${segment}/`;
}

/** 自左向右：第 i 列对应 pathPrefixes[i] 下的子目录列表；pathPrefixes 长度 = 路径深度 + 1 */
function pathPrefixesFromParam(parent: string): string[] {
  const trimmed = parent.replace(/\/+$/, '');
  const parts = trimmed.split('/').filter(Boolean);
  const out: string[] = [''];
  let acc = '';
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : `/${p}`;
    out.push(`${acc}/`);
  }
  return out;
}

export function FoldersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parent = searchParams.get('path') ?? '';

  const [columns, setColumns] = useState<FolderListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const pathPrefixes = useMemo(() => pathPrefixesFromParam(parent), [parent]);
  const pathSegments = useMemo(() => {
    const trimmed = parent.replace(/\/+$/, '');
    return trimmed.split('/').filter(Boolean);
  }, [parent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const results = await Promise.all(
          pathPrefixes.map((p) => getFolderListing(p)),
        );
        if (!cancelled) setColumns(results);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathPrefixes]);

  const crumbs = useMemo(() => {
    if (!parent) return [];
    const trimmed = parent.replace(/\/+$/, '');
    const parts = trimmed.split('/').filter(Boolean);
    const out: { label: string; path: string }[] = [];
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : `/${p}`;
      out.push({ label: p, path: `${acc}/` });
    }
    return out;
  }, [parent]);

  function goPath(p: string) {
    const next = new URLSearchParams(searchParams);
    if (p) next.set('path', p);
    else next.delete('path');
    setSearchParams(next);
  }

  const currentListing = columns[columns.length - 1];

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>目录视图</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          横向树状分栏：从左到右逐级展开子目录；最右列为当前路径下的子文件夹。
        </p>
        <div className="breadcrumb">
          <span onClick={() => goPath('')}>根</span>
          {crumbs.map((c) => (
            <span key={c.path}>
              {' / '}
              <span onClick={() => goPath(c.path)}>{c.label}</span>
            </span>
          ))}
          {loading && <span className="muted"> …</span>}
        </div>
      </div>

      {err && <div className="panel err">{err}</div>}

      {!err && columns.length > 0 && (
        <>
          <div className="panel folder-tree-panel">
            <h3 style={{ marginTop: 0 }}>目录树（横向）</h3>
            <div className="folder-tree-horizontal" role="tree" aria-label="目录树">
              {columns.map((listing, colIndex) => {
                const prefix = pathPrefixes[colIndex];
                const selectedName =
                  colIndex < pathSegments.length ? pathSegments[colIndex] : null;
                return (
                  <div
                    key={prefix || 'root'}
                    className={`folder-tree-column${colIndex > 0 ? ' folder-tree-column--branch' : ''}`}
                    role="group"
                    aria-label={prefix ? `子目录：${prefix}` : '根目录'}
                  >
                    <ul className="folder-tree-list">
                      {listing.subfolders.length === 0 ? (
                        <li className="folder-tree-empty muted">无子目录</li>
                      ) : (
                        listing.subfolders.map((f) => {
                          const isSel = f.name === selectedName;
                          return (
                            <li key={f.name}>
                              <button
                                type="button"
                                className={`folder-tree-node${isSel ? ' folder-tree-node--selected' : ''}`}
                                onClick={() => goPath(joinParent(prefix, f.name))}
                              >
                                <span className="folder-tree-node-name">{f.name}</span>
                                <span className="folder-tree-node-count muted">
                                  {f.videoCount}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {currentListing && (
            <div className="panel">
              <h3 style={{ marginTop: 0 }}>当前目录中的文件</h3>
              {currentListing.files.length === 0 ? (
                <p className="muted">无文件</p>
              ) : (
                <ul className="folder-list">
                  {currentListing.files.map((f) => (
                    <li key={f.id} className="muted">
                      {f.filename}{' '}
                      <span style={{ fontSize: '0.8rem' }} title={f.path}>
                        (#{f.id})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
