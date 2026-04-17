import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFolderListing } from '../api/videos';
import type { FolderListing } from '../api/types';

function joinParent(current: string, segment: string): string {
  if (current === '') return `/${segment}/`;
  const base = current.endsWith('/') ? current : `${current}/`;
  return `${base}${segment}/`;
}

export function FoldersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parent = searchParams.get('path') ?? '';

  const [data, setData] = useState<FolderListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await getFolderListing(parent);
      setData(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [parent]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>目录视图</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          按文件路径的第一级目录逐级浏览；当前目录下的文件列在下方。
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

      {data && (
        <>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>子目录</h3>
            {data.subfolders.length === 0 ? (
              <p className="muted">无子目录</p>
            ) : (
              <ul className="folder-list">
                {data.subfolders.map((f) => (
                  <li key={f.name}>
                    <button
                      type="button"
                      className="primary"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => goPath(joinParent(parent, f.name))}
                    >
                      {f.name}
                    </button>
                    <span className="muted">{f.videoCount} 个视频</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>当前目录中的文件</h3>
            {data.files.length === 0 ? (
              <p className="muted">无文件</p>
            ) : (
              <ul className="folder-list">
                {data.files.map((f) => (
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
        </>
      )}
    </div>
  );
}
