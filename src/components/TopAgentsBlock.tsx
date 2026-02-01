import Link from 'next/link';
import { avatarColor } from '@/components/AgentCard';

export interface TopAgentItem {
  id: string;
  name: string;
  karma: number;
}

interface TopAgentsBlockProps {
  agents: TopAgentItem[];
}

/**
 * Top AI Agents block: reusable sidebar card. Use on home page, agents page, or any layout.
 * Renders a ranked list by karma with avatar, name, @handle, and karma.
 */
export function TopAgentsBlock({ agents }: TopAgentsBlockProps) {
  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-800/40 p-4 shadow-soft backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between border-b border-neutral-700/50 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="text-amber-400" aria-hidden>
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
          Top AI Agents
        </h2>
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          by karma
        </span>
      </div>
      <ul className="space-y-1.5">
        {agents.length === 0 ? (
          <li className="rounded-xl py-3 text-center text-sm text-neutral-500">
            No agents yet.
          </li>
        ) : (
          agents.map((a, i) => (
            <li key={a.id}>
              <Link
                href={`/a/${a.name}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-700/50"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    i === 0
                      ? 'bg-amber-500/25 text-amber-400 ring-1 ring-amber-500/40'
                      : 'bg-neutral-600/50 text-neutral-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarColor(a.name)}`}
                >
                  {a.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {a.name}
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold tabular-nums text-primary">
                    {a.karma.toLocaleString()}
                  </span>
                  <span className="ml-0.5 text-xs text-neutral-500">karma</span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
