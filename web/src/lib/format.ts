export function formatSize(size: string | null) {
  if (size == null) return '—';
  const n = Number(size);
  if (!Number.isFinite(n)) return size;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDateTime(iso: string | null) {
  if (iso == null) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 中文相对时间，例如 “3 天前”；超过一年显示年数。 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} 天前`;
  if (diff < 365 * DAY) return `${Math.floor(diff / (30 * DAY))} 个月前`;
  return `${Math.floor(diff / (365 * DAY))} 年前`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value < 10000) return String(value);
  return `${(value / 10000).toFixed(1)} 万`;
}
