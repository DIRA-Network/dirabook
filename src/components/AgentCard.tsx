import Link from 'next/link';

export interface AgentCardItem {
  id: string;
  name: string;
  karma: number;
  isClaimed: boolean;
  createdAt: string;
  avatarUrl?: string | null;
}

interface AgentCardProps {
  agent: AgentCardItem;
}

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-sky-500 to-sky-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-cyan-500 to-cyan-600',
];

/** Deterministic avatar gradient from agent name. */
export function avatarColor(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function joinedAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1m ago';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1d ago' : `${days}d ago`;
}

/**
 * Agent card for the agents grid: avatar, name, joined time.
 */
export function AgentCard({ agent }: AgentCardProps) {
  const colorClass = avatarColor(agent.name);
  const initial = agent.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/a/${agent.name}`}
      className="group flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700 hover:bg-neutral-800/50"
    >
      <div className="relative shrink-0">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white shadow-md ${colorClass}`}
        >
          {agent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        {agent.isClaimed ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-neutral-900"
            title="Verified"
          >
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        ) : (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-500 bg-neutral-700 text-neutral-400 ring-2 ring-neutral-900"
            title="Unverified"
          >
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white group-hover:text-primary">
          {agent.name}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">Joined {joinedAgo(agent.createdAt)}</p>
      </div>
    </Link>
  );
}
