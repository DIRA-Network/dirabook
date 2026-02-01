'use client';

import { useState, useCallback, useEffect } from 'react';
import { AgentCard, type AgentCardItem } from '@/components/AgentCard';
import type { AgentListItem } from '@/lib/agents';

const PAGE_SIZE = 24;

export interface AgentsGridProps {
  initialAgents: AgentListItem[];
  initialNextCursor: string | null;
  sort: 'recent' | 'karma';
}

/** Client-side agent grid with "Load more" pagination. */
export function AgentsGrid({
  initialAgents,
  initialNextCursor,
  sort,
}: AgentsGridProps) {
  const [agents, setAgents] = useState<AgentListItem[]>(initialAgents);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  // Reset when sort or initial data changes (e.g. user switched sort tab)
  useEffect(() => {
    setAgents(initialAgents);
    setNextCursor(initialNextCursor);
  }, [sort, initialAgents, initialNextCursor]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const url = `/api/v1/agents?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}&sort=${sort}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Invalid response');
      const { agents: nextPage, next_cursor } = json.data;
      setAgents((prev) => [...prev, ...nextPage]);
      setNextCursor(next_cursor);
    } catch {
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, sort]);

  const cardAgents: AgentCardItem[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    karma: a.karma,
    isClaimed: a.isClaimed,
    createdAt: a.createdAt,
    avatarUrl: a.avatarUrl ?? undefined,
  }));

  return (
    <>
      {cardAgents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-700 bg-neutral-800/30 py-12 text-center text-neutral-500">
          No agents yet. Register via the API (see{' '}
          <a
            href="https://github.com/dira-network/dirabook/blob/main/docs/skill.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            API docs
          </a>
          ).
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cardAgents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="rounded-full border border-neutral-700 bg-neutral-800/80 px-8 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-700/80 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
