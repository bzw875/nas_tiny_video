import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { createEbook, deleteEbook, listEbooks, updateEbook } from '../api/ebooks';
import type { Ebook } from '../api/types';
import { formatDateTime, formatSize } from '../lib/format';

const PAGE_SIZE = 50;

const EBOOK_SORT_FIELDS = [
  'id',
  'title',
  'author',
  'file_path',
  'format',
  'size_bytes',
  'category',
  'tags',
  'created_at',
  'modified_at',
] as const;

type EbookSortField = (typeof EBOOK_SORT_FIELDS)[number];

function isSortField(s: string): s is EbookSortField {
  return (EBOOK_SORT_FIELDS as readonly string[]).includes(s);
}

const DEFAULT_FIRST_ORDER: Record<EbookSortField, 'asc' | 'desc'> = {
  id: 'desc',
  title: 'asc',
  author: 'asc',
  file_path: 'asc',
  format: 'asc',
  size_bytes: 'desc',
  category: 'asc',
  tags: 'asc',
  created_at: 'desc',
  modified_at: 'desc',
};

const FIELD_LABELS: Record<EbookSortField, string> = {
  id: 'ID',
  title: '书名',
  author: '作者',
  file_path: '文件路径',
  format: '格式',
  size_bytes: '大小',
  category: '分类',
  tags: '标签',
  created_at: '创建时间',
  modified_at: '修改时间',
};

const EMPTY_FORM: {
  title: string;
  author: string;
  filePath: string;
  format: string;
  sizeBytes: string;
} = {
  title: '',
  author: '',
  filePath: '',
  format: '',
  sizeBytes: '',
};

export function EbooksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q') ?? '';
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0);
  const sortParam = searchParams.get('sort');
  const orderParam = searchParams.get('order');

  const sortField = sortParam && isSortField(sortParam) ? sortParam : undefined;
  const sortOrder =
    orderParam === 'asc' || orderParam === 'desc' ? orderParam : undefined;

  const [items, setItems] = useState<Ebook[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(qParam);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editEbook, setEditEbook] = useState<Ebook | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const skip = page * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await listEbooks({
        skip,
        take: PAGE_SIZE,
        search: qParam.trim() || undefined,
        sortBy: sortField ?? 'modified_at',
        sortOrder:
          sortField && sortOrder
            ? sortOrder
            : sortField
              ? DEFAULT_FIRST_ORDER[sortField]
              : 'desc',
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [skip, qParam, sortField, sortOrder]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch(qParam);
  }, [qParam]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (editEbook !== null) {
      if (editEbook.id === 0) {
        setForm({ ...EMPTY_FORM });
      } else {
        setForm({
          title: editEbook.title,
          author: editEbook.author,
          filePath: editEbook.filePath,
          format: editEbook.format,
          sizeBytes: String(editEbook.sizeBytes),
        });
      }
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [editEbook]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    const t = search.trim();
    if (t) next.set('q', t);
    else next.delete('q');
    next.set('page', '0');
    setSearchParams(next);
  }

  function goPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  function setSort(field: EbookSortField) {
    const next = new URLSearchParams(searchParams);
    next.set('page', '0');
    if (sortField === field) {
      const o = sortOrder ?? DEFAULT_FIRST_ORDER[field];
      next.set('sort', field);
      next.set('order', o === 'asc' ? 'desc' : 'asc');
    } else {
      next.set('sort', field);
      next.set('order', DEFAULT_FIRST_ORDER[field]);
    }
    setSearchParams(next);
  }

  function sortMark(field: EbookSortField): string {
    if (sortField !== field) return '';
    const o = sortOrder ?? (sortField ? DEFAULT_FIRST_ORDER[sortField] : 'desc');
    return o === 'asc' ? ' ↑' : ' ↓';
  }

  function openCreate() {
    setEditEbook({
      id: 0,
      title: '',
      author: '',
      filePath: '',
      format: '',
      sizeBytes: 0,
      category: null,
      tags: null,
      createdAt: '',
      modifiedAt: '',
    });
  }

  function openEdit(ebook: Ebook) {
    setEditEbook(ebook);
  }

  function closeDialog() {
    setEditEbook(null);
    setSaving(false);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    const sizeNum = Number(form.sizeBytes);
    if (!Number.isFinite(sizeNum) || sizeNum < 0) {
      setErr('文件大小必须为非负数字');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body = {
        title: form.title.trim(),
        author: form.author.trim(),
        filePath: form.filePath.trim(),
        format: form.format.trim(),
        sizeBytes: sizeNum,
      };
      if (editEbook!.id === 0) {
        await createEbook(body);
      } else {
        await updateEbook(editEbook!.id, body);
      }
      closeDialog();
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定要删除这本电子书吗？')) return;
    setDeletingId(id);
    setErr(null);
    try {
      await deleteEbook(id);
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tableHeaders: { field: EbookSortField; label: string; className?: string }[] = useMemo(
    () => [
      { field: 'id', label: 'ID' },
      { field: 'title', label: '书名', className: 'cell-filename' },
      { field: 'author', label: '作者' },
      { field: 'file_path', label: '文件路径', className: 'cell-path' },
      { field: 'format', label: '格式' },
      { field: 'size_bytes', label: '大小' },
      { field: 'category', label: '分类' },
      { field: 'tags', label: '标签' },
      { field: 'created_at', label: '创建时间' },
      { field: 'modified_at', label: '修改时间' },
    ],
    [],
  );

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>电子书管理</h2>
        <p className="muted" style={{ marginTop: '-0.25rem' }}>
          管理电子书库，支持搜索、排序、新增、编辑和删除操作。表头可点击排序。
        </p>
        <form className="toolbar" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="搜索书名或作者…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="primary">
            搜索
          </button>
          <button type="button" onClick={openCreate}>
            新增电子书
          </button>
          <span className="muted">
            共 {total} 条{loading ? '，加载中…' : ''}
          </span>
        </form>
      </div>

      {err && <div className="panel err">{err}</div>}

      <div className="panel video-table-wrap">
        <table className="data video-table">
          <thead>
            <tr>
              {tableHeaders.map((h) => (
                <th key={h.field}>
                  <button
                    type="button"
                    className="th-sort"
                    onClick={() => setSort(h.field)}
                  >
                    {FIELD_LABELS[h.field]}
                    {sortMark(h.field)}
                  </button>
                </th>
              ))}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={tableHeaders.length + 1}
                  className="muted"
                  style={{ textAlign: 'center', padding: '1.25rem' }}
                >
                  暂无数据
                </td>
              </tr>
            )}
            {items.map((ebook) => (
              <tr key={ebook.id}>
                <td>{ebook.id}</td>
                <td className="cell-filename" title={ebook.title}>
                  {ebook.title}
                </td>
                <td>{ebook.author}</td>
                <td className="cell-path" title={ebook.filePath}>
                  {ebook.filePath}
                </td>
                <td>
                  <span className="tag-chip">{ebook.format}</span>
                </td>
                <td>{formatSize(String(ebook.sizeBytes))}</td>
                <td>{ebook.category ?? ''}</td>
                <td>{ebook.tags ?? ''}</td>
                <td>{formatDateTime(ebook.createdAt)}</td>
                <td>{formatDateTime(ebook.modifiedAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => openEdit(ebook)}>
                    编辑
                  </button>{' '}
                  <button
                    type="button"
                    disabled={deletingId === ebook.id}
                    onClick={() => handleDelete(ebook.id)}
                  >
                    {deletingId === ebook.id ? '删除中…' : '删除'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        className="tag-dialog"
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
      >
        {editEbook !== null && (
          <div>
            <h3 style={{ marginTop: 0 }}>
              {editEbook.id === 0 ? '新增电子书' : '编辑电子书'}
            </h3>
            <form onSubmit={submitForm}>
              <div className="form-field">
                <label htmlFor="ebook-title">书名</label>
                <input
                  id="ebook-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ebook-author">作者</label>
                <input
                  id="ebook-author"
                  type="text"
                  required
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ebook-path">文件路径</label>
                <input
                  id="ebook-path"
                  type="text"
                  required
                  value={form.filePath}
                  onChange={(e) => setForm((f) => ({ ...f, filePath: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ebook-format">格式</label>
                <input
                  id="ebook-format"
                  type="text"
                  required
                  placeholder="epub / pdf / mobi / azw3 …"
                  value={form.format}
                  onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ebook-size">文件大小（字节）</label>
                <input
                  id="ebook-size"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.sizeBytes}
                  onChange={(e) => setForm((f) => ({ ...f, sizeBytes: e.target.value }))}
                />
              </div>
              <div className="toolbar" style={{ marginTop: '1rem' }}>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button type="button" onClick={closeDialog} disabled={saving}>
                  取消
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {total > PAGE_SIZE && (
        <div
          className="panel toolbar"
          style={{ justifyContent: 'space-between' }}
        >
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => goPage(page - 1)}
          >
            上一页
          </button>
          <span className="muted">
            第 {page + 1} / {totalPages} 页
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => goPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
