import { Link } from 'react-router-dom';
import type { TreeholeComment } from '../api/treehole';
import { formatDateTime, timeAgo } from '../lib/format';

const IMG_SRC = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i;
const IMG_TAG = /<img\b[^>]*>/gi;

function firstImage(content: string): string | null {
  return content.match(IMG_SRC)?.[1] ?? null;
}

function plainText(content: string): string {
  return content.replace(IMG_TAG, '').replace(/\r\n/g, '\n').trim();
}

export function TreeholeCard({ comment }: { comment: TreeholeComment }) {
  const image = firstImage(comment.content ?? '');
  const text = plainText(comment.content ?? '');
  const authorPath = `/treehole/author/${encodeURIComponent(comment.author)}`;

  return (
    <article className="th-card">
      <header className="th-card-meta">
        <Link className="th-author" to={authorPath}>
          {comment.author}
        </Link>
        <a
          className="th-ref"
          href={`https://jandan.net/t/${comment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="在煎蛋查看原帖"
        >
          #{comment.id}
        </a>
        <div className="th-meta-right">
          <span title={formatDateTime(comment.dateGmt)}>{timeAgo(comment.dateGmt)}</span>
          {comment.ipLocation ? <span>IP · {comment.ipLocation}</span> : null}
          <span className="th-vote-up" title="喜欢">
            👍 {comment.votePositive}
          </span>
          <span className="th-vote-down" title="不喜欢">
            👎 {comment.voteNegative}
          </span>
          <span className="th-vote-comment" title="回复数">
            💬 {comment.subCommentCount}
          </span>
        </div>
      </header>
      {text ? <p className="th-content">{text}</p> : null}
      {image ? (
        <img className="th-image" src={image} alt="树洞配图" loading="lazy" />
      ) : null}
    </article>
  );
}
