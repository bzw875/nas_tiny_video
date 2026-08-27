import { useEffect, useMemo, useState } from 'react';
import { listTags } from '../api/tags';
import { updateVideoTags } from '../api/videos';
import type { Tag, Video } from '../api/types';

type Props = {
  video: Video;
  onUpdated: (v: Video) => void;
  onClose: () => void;
};

export function VideoTagsEditor({ video, onUpdated, onClose }: Props) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(video.tags.map((t) => t.id)),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(video.tags.map((t) => t.id)));
  }, [video.id, video.tags]);

  useEffect(() => {
    listTags()
      .then(setAllTags)
      .catch((e: Error) => setErr(e.message));
  }, []);

  const sortedTags = useMemo(
    () => [...allTags].sort((a, b) => a.name.localeCompare(b.name)),
    [allTags],
  );

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const next = await updateVideoTags(video.id, [...selected]);
      onUpdated(next);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tag-editor-body">
      <div className="muted" style={{ marginBottom: '0.35rem' }}>
        {video.filename}
      </div>
      {err && <div className="err">{err}</div>}
      <div className="tag-editor-scroll">
        {sortedTags.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`tag-chip ${selected.has(t.id) ? 'tag-chip--selected' : ''}`}
            aria-pressed={selected.has(t.id)}
            onClick={() => {
              setSelected((prev) => {
                const n = new Set(prev);
                if (n.has(t.id)) n.delete(t.id);
                else n.add(t.id);
                return n;
              });
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="primary" disabled={saving} onClick={save}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setSelected(new Set(video.tags.map((x) => x.id)));
            onClose();
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
