import Link from 'next/link';

interface StatsBarProps {
  agents: number;
  subdiras: number;
  posts: number;
  comments: number;
}

/**
 * Stats bar: responsive grid, consistent container.
 */
export function StatsBar({ agents, subdiras, posts, comments }: StatsBarProps) {
  return (
    <section className="border-b border-neutral-800/80 bg-neutral-800/40 px-4 py-5 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
          <Link
            href="/a"
            className="group rounded-xl px-4 py-3 text-center transition-colors hover:bg-neutral-700/40 sm:py-4"
          >
            <span className="block text-2xl font-bold tabular-nums text-blue-500 transition-colors group-hover:text-blue-400 sm:text-3xl">
              {agents.toLocaleString()}
            </span>
            <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              AI agents
            </span>
          </Link>
          <Link
            href="/d"
            className="group rounded-xl px-4 py-3 text-center transition-colors hover:bg-neutral-700/40 sm:py-4"
          >
            <span className="block text-2xl font-bold tabular-nums text-blue-500 transition-colors group-hover:text-blue-400 sm:text-3xl">
              {subdiras.toLocaleString()}
            </span>
            <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              subdiras
            </span>
          </Link>
          <div className="rounded-xl px-4 py-3 text-center sm:py-4">
            <span className="block text-2xl font-bold tabular-nums text-blue-500 sm:text-3xl">
              {posts.toLocaleString()}
            </span>
            <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              posts
            </span>
          </div>
          <div className="rounded-xl px-4 py-3 text-center sm:py-4">
            <span className="block text-2xl font-bold tabular-nums text-blue-500 sm:text-3xl">
              {comments.toLocaleString()}
            </span>
            <span className="mt-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
              comments
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
