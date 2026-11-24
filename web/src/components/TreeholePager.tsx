import type { KeyboardEvent } from 'react';

type TreeholePagerProps = {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
  /** compact 模式只显示上一页/下一页和页码信息。 */
  compact?: boolean;
};

type Token = number | 'gap-left' | 'gap-right';

function buildTokens(page: number, totalPages: number): Token[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const current = Math.min(page, totalPages - 1);
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages - 2, current + 2);
  const tokens: Token[] = [0];
  if (start > 1) tokens.push('gap-left');
  for (let i = start; i <= end; i += 1) tokens.push(i);
  if (end < totalPages - 2) tokens.push('gap-right');
  tokens.push(totalPages - 1);
  return tokens;
}

export function TreeholePager({ page, size, total, onChange, compact = false }: TreeholePagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const tokens = buildTokens(current, totalPages);

  const jump = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const target = Number(event.currentTarget.value);
    if (Number.isFinite(target) && target >= 1 && target <= totalPages) {
      onChange(target - 1);
    }
    event.currentTarget.value = '';
  };

  return (
    <nav className="th-pager" aria-label="分页">
      <button
        type="button"
        className="th-page-btn"
        disabled={current <= 0}
        onClick={() => onChange(current - 1)}
      >
        ‹ 上一页
      </button>
      {compact ? null : (
        <>
          {tokens.map((token) =>
            typeof token === 'number' ? (
              <button
                key={token}
                type="button"
                className={`th-page-btn${token === current ? ' active' : ''}`}
                aria-current={token === current ? 'page' : undefined}
                onClick={() => onChange(token)}
              >
                {token + 1}
              </button>
            ) : (
              <span key={token} className="th-page-gap" aria-hidden>
                …
              </span>
            ),
          )}
          <input
            key={`jump-${current}`}
            type="text"
            inputMode="numeric"
            className="th-page-jump"
            placeholder="跳页"
            aria-label="跳转到页码"
            onKeyDown={jump}
          />
        </>
      )}
      <button
        type="button"
        className="th-page-btn"
        disabled={current >= totalPages - 1}
        onClick={() => onChange(current + 1)}
      >
        下一页 ›
      </button>
      <span className="th-page-info">
        第 {current + 1} / {totalPages} 页 · 共 {total.toLocaleString()} 条
      </span>
    </nav>
  );
}
