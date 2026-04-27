import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteNovel, getAllNovels } from '../api/novels';
import type { NovelListItem } from '../api/types';

function formatCount(count: number) {
  if (count < 10000) {
    return count.toString();
  }
  return `${(count / 10000).toFixed(1)}万`;
}

export function NovelHome() {
  const [novels, setNovels] = useState<NovelListItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllNovels().then((res) => {
      if (res) setNovels(res);
    });
  }, []);

  const filterNovels = useMemo(() => {
    if (!search) return novels;
    return novels.filter(
      (tmp) =>
        tmp.name.includes(search) || (tmp.author && tmp.author.includes(search)),
    );
  }, [search, novels]);

  return (
    <div className="panel novel-shell">
      <input
        type="text"
        placeholder="搜索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="novel-search"
      />
      <div>共 {filterNovels.length}</div>
      <div className="books-table">
        {filterNovels.map((tmp) => (
          <div className="novel-row" key={tmp.id}>
            <div>
              <Link
                to={`/novel/${tmp.id}`}
                className="novel-title-link"
              >
                {tmp.name.replace('.txt', '')}
              </Link>
            </div>
            <div className="anthor-div text-ellipsis">{tmp.author}</div>
            <div className="novel-meta-row">
              <span>{formatCount(tmp.wordCount)}字</span>
              <span>{tmp.starRating}⭐️</span>
              <span>{tmp.readCount}阅</span>
              <span>
                <button
                  type="button"
                  className="novel-delete"
                  onClick={async () => {
                    if (confirm('确定删除吗？')) {
                      await deleteNovel(tmp.id);
                      setNovels((prev) => prev.filter((n) => n.id !== tmp.id));
                    }
                  }}
                >
                  删除
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
