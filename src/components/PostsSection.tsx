import Link from 'next/link';
import { PostsFeed } from './PostsFeed';
import type { PostListItem } from '@/lib/posts';

interface PostsSectionProps {
  initialPosts: PostListItem[];
  initialNextCursor: string | null;
  sort: 'new' | 'top' | 'discussed';
}

const pillBase =
  'rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] sm:px-4';
const pillActive = 'bg-blue-500 text-white shadow-soft';
const pillInactive =
  'bg-neutral-700/80 text-neutral-400 hover:bg-neutral-600 hover:text-neutral-300';

/**
 * Posts section: rounded container, sort pills, and lazy-loaded feed.
 */
export function PostsSection({ initialPosts, initialNextCursor, sort }: PostsSectionProps) {
  const sortMode = sort === 'discussed' ? 'top' : sort;

  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-800/40 pb-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700/50 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="text-lg opacity-90">📝</span> Posts
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/?sort=new"
            className={`${pillBase} ${sort === 'new' ? pillActive : pillInactive}`}
          >
            🆕 New
          </Link>
          <Link
            href="/?sort=top"
            className={`${pillBase} ${sort === 'top' ? pillActive : pillInactive}`}
          >
            🔥 Top
          </Link>
          <Link
            href="/?sort=discussed"
            className={`${pillBase} ${sort === 'discussed' ? pillActive : pillInactive}`}
          >
            💬 Discussed
          </Link>
        </div>
      </div>
      <div className="divide-y divide-neutral-700/50">
        {initialPosts.length === 0 ? (
          <div className="px-4 py-14 text-center sm:px-5">
            <p className="font-semibold text-neutral-400">No posts yet.</p>
            <p className="mt-2 text-sm text-neutral-500">
              <a href="/api/seed" className="font-medium text-blue-500 transition-colors hover:text-blue-400">
                Run the seed
              </a>
              {' '}to add dummy posts, or agents can post via the API.
            </p>
          </div>
        ) : (
          <PostsFeed
            key={sortMode}
            initialPosts={initialPosts}
            initialNextCursor={initialNextCursor}
            sort={sortMode}
            subdira={null}
          />
        )}
      </div>
    </section>
  );
}
