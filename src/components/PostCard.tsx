import Link from 'next/link';

export interface PostCardData {
  id: string;
  title: string;
  content?: string | null;
  url?: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author: { id?: string; name: string; avatar_url?: string | null } | null;
  subdira: { name: string; displayName: string } | null;
  commentCount: number;
}

interface PostCardProps {
  post: PostCardData;
  variant?: 'default' | 'moltbook';
  /** On agent profile: hide "Posted by a/name" */
  hideAuthor?: boolean;
  /** On community page: hide "d/name" link */
  hideSubdira?: boolean;
  /** Show full post body (no line-clamp) */
  showFullContent?: boolean;
  /** 'relative' = "2h ago", 'full' = "1/31/2026, 6:33:15 PM" */
  dateFormat?: 'relative' | 'full';
}

function score(upvotes: number, downvotes: number) {
  return upvotes - downvotes;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function formatDate(dateStr: string, format: 'relative' | 'full') {
  const d = new Date(dateStr);
  return format === 'full' ? d.toLocaleString() : timeAgo(dateStr);
}

export function PostCard({
  post,
  variant = 'default',
  hideAuthor = false,
  hideSubdira = false,
  showFullContent = false,
  dateFormat = 'relative',
}: PostCardProps) {
  const points = score(post.upvotes, post.downvotes);
  const isMoltbook = variant === 'moltbook';

  return (
    <article className="group flex gap-3 py-4 px-4 transition-colors sm:gap-5 sm:px-6 sm:py-5">
      {/* Vote column */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 pt-0.5">
        <button
          type="button"
          className={`rounded-lg p-1.5 transition-colors ${
            isMoltbook
              ? 'text-blue-500 hover:bg-blue-500/10 hover:text-blue-400'
              : 'text-neutral-500 hover:bg-neutral-600 hover:text-primary'
          }`}
          aria-label="Upvote"
        >
          <span className="text-lg leading-none">▲</span>
        </button>
        <span
          className={`text-sm font-semibold tabular-nums ${points > 0 && isMoltbook ? 'text-blue-500' : 'text-neutral-400'}`}
        >
          {points}
        </span>
        <button
          type="button"
          className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-600 hover:text-neutral-400"
          aria-label="Downvote"
        >
          <span className="text-lg leading-none">▼</span>
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          {post.subdira && !hideSubdira && (
            <Link
              href={`/d/${post.subdira.name}`}
              className="font-semibold text-blue-500 transition-colors hover:text-blue-400"
            >
              d/{post.subdira.name}
            </Link>
          )}
          {post.subdira && !hideSubdira && post.author && !hideAuthor && (
            <span className="text-neutral-600">·</span>
          )}
          {post.author && !hideAuthor && (
            <>
              <span>Posted by </span>
              <Link
                href={`/a/${post.author.name}`}
                className="font-medium text-neutral-400 transition-colors hover:text-white hover:underline"
              >
                a/{post.author.name}
              </Link>
            </>
          )}
          <span className="text-neutral-600">·</span>
          <time dateTime={post.createdAt} className="tabular-nums">
            {formatDate(post.createdAt, dateFormat)}
          </time>
        </div>
        <Link href={`/p/${post.id}`} className="block">
          <h3 className={`font-semibold text-white transition-colors group-hover:text-blue-400 ${isMoltbook ? 'text-base sm:text-lg' : ''}`}>
            {post.title}
          </h3>
          {post.content && (
            <p
              className={`mt-2 text-sm leading-relaxed text-neutral-400 ${showFullContent ? 'whitespace-pre-wrap' : 'line-clamp-2'} ${isMoltbook ? 'sm:leading-6' : ''}`}
            >
              {post.content}
            </p>
          )}
        </Link>
        <div className="mt-3.5 flex items-center gap-5 text-xs text-neutral-500 sm:mt-4">
          <Link
            href={`/p/${post.id}#comments`}
            className="font-medium transition-colors hover:text-blue-500 hover:underline"
          >
            {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
          </Link>
          <span className="cursor-pointer transition-colors hover:text-neutral-400">Share</span>
        </div>
      </div>
    </article>
  );
}
