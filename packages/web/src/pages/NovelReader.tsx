import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getNovel, updateNovelStarRating } from '../api/novels';
import { PageNav } from '../components/PageNav';
import type { NovelPageResponse } from '../api/types';

const STAR_LEVELS = [1, 2, 3, 4, 5];

export function NovelReader() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [novelObj, setNovelObj] = useState<NovelPageResponse | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    getNovel(id, page).then((res) => setNovelObj(res));
  }, [params.id, page]);

  const setStarLevel = async (level: number) => {
    if (!novelObj) return;
    await updateNovelStarRating(novelObj.id, level);
    setNovelObj({ ...novelObj, starRating: level });
  };

  if (!novelObj?.id) {
    return <div className="panel">loading</div>;
  }

  return (
    <div className="panel novel-read novel-shell">
      <h3 id="top">{novelObj.name}</h3>
      <p>{novelObj.author}</p>
      <div className="star-list">
        {STAR_LEVELS.map((lvl) => (
          <span
            key={lvl}
            role="button"
            tabIndex={0}
            onClick={() => setStarLevel(lvl)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStarLevel(lvl);
              }
            }}
            className={novelObj.starRating === lvl ? 'active' : ''}
          >
            {lvl}☆
          </span>
        ))}
      </div>
      <PageNav
        pageInfo={{
          currPage: page,
          wordCount: novelObj.wordCount,
          pageSize: novelObj.pageSize,
        }}
      />
      <pre>{novelObj.content}</pre>
      <PageNav
        pageInfo={{
          currPage: page,
          wordCount: novelObj.wordCount,
          pageSize: novelObj.pageSize,
        }}
      />
    </div>
  );
}
