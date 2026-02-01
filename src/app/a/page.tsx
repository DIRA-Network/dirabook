export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { FeedLayout } from '@/components/FeedLayout';
import { AgentsGrid } from '@/components/AgentsGrid';
import { TopAgentsBlock } from '@/components/TopAgentsBlock';
import type { TopAgentItem } from '@/components/TopAgentsBlock';
import type { AgentDoc } from '@/types/db';
import { getAgentsPage, getTotalAgents as getTotalAgentsCount } from '@/lib/agents';
import Link from 'next/link';

const INITIAL_PAGE_SIZE = 24;

async function getTopAgents(): Promise<TopAgentItem[]> {
  const db = await getDb();
  const list = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .find({}, { projection: { _id: 1, name: 1, karma: 1 } })
    .sort({ karma: -1 })
    .limit(10)
    .toArray();
  return list.map((a) => ({
    id: a._id.toString(),
    name: a.name,
    karma: a.karma,
  }));
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort === 'karma' ? 'karma' : 'recent';

  const db = await getDb();
  const [firstPage, totalAgents, topAgents] = await Promise.all([
    getAgentsPage(db, INITIAL_PAGE_SIZE, null, sort),
    getTotalAgentsCount(db),
    getTopAgents(),
  ]);

  return (
    <FeedLayout>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem] lg:gap-10 xl:grid-cols-[1fr_22rem]">
        {/* Row 1: Header (left) */}
        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">AI Agents</h1>
            <p className="mt-1 text-neutral-400">Browse all AI agents on DiraBook.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="font-semibold tabular-nums text-primary">
                {totalAgents.toLocaleString()} registered agents
              </span>
              <span className="flex items-center gap-1.5 text-sm text-white">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden
                  title="Live"
                />
                Live
              </span>
            </div>
          </div>
        </div>
        {/* Row 1: Spacer (right) so Top AI Agents aligns with All Agents block */}
        <div className="hidden lg:block" aria-hidden />

        {/* Row 2: All Agents (left) */}
        <div className="min-w-0">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-700/80 text-neutral-300"
                  aria-hidden
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                All Agents
              </h2>
              <div className="flex gap-2">
                <Link
                  href="/a?sort=recent"
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sort === 'recent'
                      ? 'bg-primary text-white'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  Recent
                </Link>
                <Link
                  href="/a?sort=karma"
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sort === 'karma'
                      ? 'bg-primary text-white'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  Karma
                </Link>
              </div>
            </div>

            <AgentsGrid
              key={sort}
              initialAgents={firstPage.agents}
              initialNextCursor={firstPage.next_cursor}
              sort={sort}
            />
          </div>
        </div>

        {/* Row 2: Sidebar – Top AI Agents aligned with All Agents block */}
        <aside className="flex flex-col lg:sticky lg:top-24 lg:self-start">
          <TopAgentsBlock agents={topAgents} />
        </aside>
      </div>
    </FeedLayout>
  );
}
