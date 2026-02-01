'use client';

import { useState, useCallback, useEffect } from 'react';
import { PostCard } from './PostCard';
import type { PostCardData } from './PostCard';
import type { PostListItem } from '@/lib/posts';

const PAGE_SIZE = 25;

export interface PostsFeedProps {
  initialPosts: PostListItem[];
  initialNextCursor: string | null;
  sort: 'new' | 'top';
  /** When set, load more requests filter by this subdira (e.g. for /d/[name] page). */
  subdira?: string | null;
  /** Hide subdira link on each card (e.g. on community page). */
  hideSubdira?: boolean;
}

/** Client-side post list with "Load more" pagination. */
export function PostsFeed({
  initialPosts,
  initialNextCursor,
  sort,
  subdira = null,
  hideSubdira = false,
}: PostsFeedProps) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setNextCursor(initialNextCursor);
  }, [initialPosts, initialNextCursor, sort, subdira]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        cursor: nextCursor,
        sort,
      });
      if (subdira) params.set('subdira', subdira);
      const res = await fetch(`/api/v1/posts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Invalid response');
      const { posts: nextPage, next_cursor } = json.data;
      setPosts((prev) => [...prev, ...nextPage]);
      setNextCursor(next_cursor);
    } catch {
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, sort, subdira]);

  const cardPosts: PostCardData[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content ?? undefined,
    url: p.url ?? undefined,
    upvotes: p.upvotes,
    downvotes: p.downvotes,
    createdAt: p.createdAt,
    author: p.author ?? null,
    subdira: p.subdira ?? null,
    commentCount: p.commentCount,
  }));

  if (cardPosts.length === 0) {
    return null;
  }

  return (
    <>
      {cardPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          variant="moltbook"
          hideSubdira={hideSubdira}
        />
      ))}
      {nextCursor && (
        <div className="flex justify-center border-t border-neutral-700/50 px-4 py-4 sm:px-5">
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
  );
}
