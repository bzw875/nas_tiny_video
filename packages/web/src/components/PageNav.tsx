import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type PageNavProps = {
  pageInfo: {
    wordCount: number;
    pageSize: number;
    currPage: number;
  };
};

export function PageNav({ pageInfo }: PageNavProps) {
  const { wordCount, pageSize, currPage } = pageInfo;
  const arrPages = Math.max(1, Math.ceil(wordCount / pageSize));
  const { id } = useParams();
  const navigate = useNavigate();

  const pages = useMemo(() => {
    const arr: number[] = [1];
    const start = Math.max(currPage - 4, 1);
    const end = Math.min(currPage + 4, arrPages);
    for (let i = start; i <= end; i++) {
      arr.push(i);
    }
    arr.push(arrPages);
    return [...new Set(arr)].sort((a, b) => a - b);
  }, [arrPages, currPage]);

  const path = (page: number) =>
    `/novel/${id}${page <= 1 ? '' : `?page=${page}`}`;

  return (
    <div className="page-nav">
      <div className="quick-nav">
        <Link
          to={path(currPage - 1)}
          className={currPage <= 1 ? 'disabled' : ''}
          style={{ width: '50%', marginRight: '10px' }}
          onClick={(e) => {
            if (currPage <= 1) e.preventDefault();
          }}
        >
          &lt;&lt;
        </Link>
        <Link
          to={path(currPage + 1)}
          className={currPage >= arrPages ? 'disabled' : ''}
          style={{ width: '50%' }}
          onClick={(e) => {
            if (currPage >= arrPages) e.preventDefault();
          }}
        >
          &gt;&gt;
        </Link>
      </div>
      {pages.map((p) => (
        <Link
          key={p}
          to={path(p)}
          className={p === currPage ? 'active' : ''}
        >
          {p === 1 ? '1' : p}
        </Link>
      ))}
      <input
        type="text"
        className="page-jump"
        defaultValue=""
        key={currPage}
        onBlur={(e) => {
          const page = Number(e.target.value);
          if (page > 0 && page <= arrPages) {
            navigate(path(page));
          }
        }}
      />
    </div>
  );
}
