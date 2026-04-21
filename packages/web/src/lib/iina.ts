function normalizePlayableUrl(path: string): string {
  const raw = `/Volumes/banzhaowu/FormatFactory${path.trim()}`;
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? `file://${raw}` : `file:///${raw}`;
}

export function buildIinaWeblink(path: string): string {
  const url = normalizePlayableUrl(path);
  return `iina://weblink?url=${encodeURIComponent(url)}`;
}
