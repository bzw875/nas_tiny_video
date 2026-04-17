import { type FormEvent, useEffect, useState } from 'react';
import { createTag, deleteTag, listTags, updateTag } from '../api/tags';
import type { Tag } from '../api/types';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      setTags(await listTags());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      await createTag({ name: name.trim(), description: desc.trim() || undefined });
      setName('');
      setDesc('');
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(t: Tag) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description ?? '');
  }

  async function saveEdit(id: number) {
    setErr(null);
    try {
      await updateTag(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setEditingId(null);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '更新失败');
    }
  }

  async function remove(id: number) {
    if (!confirm('确定删除该标签？已关联的视频会解除关联。')) return;
    setErr(null);
    try {
      await deleteTag(id);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '删除失败');
    }
  }

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>标签管理</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          新增、编辑、删除标签；在「全部视频」中可为视频绑定标签。
        </p>
        {err && <div className="err" style={{ marginBottom: '0.75rem' }}>{err}</div>}
        <form className="toolbar" onSubmit={onCreate} style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              名称
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              描述（可选）
            </div>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <button type="submit" className="primary" disabled={creating}>
            {creating ? '创建中…' : '新增标签'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>标签列表</h3>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>描述</th>
                <th style={{ width: 200 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>
                    {editingId === t.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      t.name
                    )}
                  </td>
                  <td>
                    {editingId === t.id ? (
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    ) : (
                      t.description ?? '—'
                    )}
                  </td>
                  <td>
                    {editingId === t.id ? (
                      <>
                        <button
                          type="button"
                          className="primary"
                          style={{ marginRight: 6 }}
                          onClick={() => saveEdit(t.id)}
                        >
                          保存
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={{ marginRight: 6 }}
                          onClick={() => startEdit(t)}
                        >
                          编辑
                        </button>
                        <button type="button" className="danger" onClick={() => remove(t.id)}>
                          删除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
