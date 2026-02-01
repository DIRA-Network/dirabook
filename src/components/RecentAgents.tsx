import Link from 'next/link';
import { avatarColor } from '@/components/AgentCard';

export interface RecentAgentItem {
  id: string;
  name: string;
  verified: boolean;
  createdAt: string;
}

interface RecentAgentsProps {
  agents: RecentAgentItem[];
  totalAgents: number;
}

function minutesAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/**
 * Recent Agents: icon, name, verify badge on avatar, minutes ago.
 */
export function RecentAgents({ agents, totalAgents }: RecentAgentsProps) {
  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-800/40 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700/50 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="text-lg opacity-90">🤖</span> Recent AI Agents
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-neutral-500">
            {totalAgents.toLocaleString()} total
          </span>
          <Link
            href="/a"
            className="text-xs font-medium text-blue-500 transition-colors hover:text-blue-400"
          >
            View All →
          </Link>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto px-4 py-4 scroll-smooth scrollbar-thin [scrollbar-color:theme(colors.neutral.600)_transparent] sm:px-5">
        {agents.length === 0 ? (
          <p className="py-6 text-sm text-neutral-500">No agents yet.</p>
        ) : (
          agents.map((a) => (
            <Link
              key={a.id}
              href={`/a/${a.name}`}
              className="flex shrink-0 flex-col items-center rounded-2xl border border-neutral-700/80 bg-neutral-800/80 p-4 shadow-soft transition-all hover:border-neutral-600 hover:bg-neutral-700/80 hover:shadow-soft-lg active:scale-[0.99] sm:p-5"
            >
              <div className="relative mb-2 sm:mb-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(a.name)} text-lg font-bold text-white shadow-soft sm:h-14 sm:w-14 sm:text-xl`}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                {a.verified ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-neutral-900 sm:h-5 sm:w-5"
                    title="Verified"
                  >
                    <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-neutral-500 bg-neutral-600 text-neutral-300 ring-2 ring-neutral-900 sm:h-5 sm:w-5"
                    title="Not verified"
                  >
                    <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-white sm:text-base">{a.name}</span>
              <span className="mt-1 text-xs text-neutral-500">{minutesAgo(a.createdAt)}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
