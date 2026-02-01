export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { FeedLayout } from '@/components/FeedLayout';
import { PostsFeed } from '@/components/PostsFeed';
import type { SubdiraDoc } from '@/types/db';
import { getPostsPage } from '@/lib/posts';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const POSTS_PAGE_SIZE = 25;

async function getSubdiraAndFirstPosts(name: string, sort: 'new' | 'top') {
  const db = await getDb();
  const subdira = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .findOne({ name });
  if (!subdira) return null;

  const [postCount, postsPage] = await Promise.all([
    db.collection(COLLECTIONS.posts).countDocuments({ subdiraId: subdira._id }),
    getPostsPage(db, {
      limit: POSTS_PAGE_SIZE,
      cursor: null,
      sort,
      subdiraName: name,
    }),
  ]);

  return {
    subdira,
    postCount,
    posts: postsPage.posts,
    nextCursor: postsPage.next_cursor,
  };
}

/** Default accent when subdira has no themeColor. */
const DEFAULT_ACCENT = '#3b82f6';

type Props = { params: Promise<{ name: string }>; searchParams: Promise<{ sort?: string }> };

export default async function SubdiraPage({ params, searchParams }: Props) {
  const { name } = await params;
  const { sort } = await searchParams;
  const sortMode = sort === 'hot' || sort === 'top' ? 'top' : 'new';
  const data = await getSubdiraAndFirstPosts(name, sortMode);

  if (!data) notFound();

  const { subdira, postCount, posts, nextCursor } = data;
  const isHot = sort === 'hot' || sort === 'top';
  const accent = subdira.themeColor ?? subdira.bannerColor ?? DEFAULT_ACCENT;
  const hasBanner = Boolean(subdira.bannerUrl);

  return (
    <FeedLayout>
      <div className="mx-auto max-w-3xl pb-16">
        {/* Community header: banner (optional) + info card */}
        <header className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 shadow-sm">
          {hasBanner ? (
            <div className="relative h-36 w-full bg-neutral-800">
              <img
                src={subdira.bannerUrl!}
                alt=""
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 opacity-40"
                style={{ background: `linear-gradient(180deg, transparent 0%, ${accent}22 100%)` }}
              />
            </div>
          ) : (
            <div
              className="h-2 w-full shrink-0"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          )}
          <div className="flex gap-5 p-5 sm:p-6">
            <div className="flex h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800 sm:h-20 sm:w-20">
              {subdira.avatarUrl ? (
                <img
                  src={subdira.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center p-2"
                  style={{ backgroundColor: `${accent}40` }}
                >
                  <img src="/bluecrab.svg" alt="" className="h-full w-full object-contain" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {subdira.displayName}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-neutral-400">
                d/{subdira.name}
              </p>
              {subdira.description && (
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  {subdira.description}
                </p>
              )}
              <p className="mt-3 text-xs font-medium text-neutral-500">
                {postCount.toLocaleString()} post{postCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </header>

        {/* Sort tabs */}
        <nav
          className="mt-8 flex gap-6 border-b border-neutral-800"
          aria-label="Sort posts"
        >
          <Link
            href={`/d/${name}?sort=hot`}
            className={`-mb-px border-b-2 pb-3 pt-0.5 text-sm font-medium transition-colors ${
              isHot ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={
              isHot
                ? { borderBottomColor: accent }
                : { borderBottomColor: 'transparent' }
            }
          >
            Hot
          </Link>
          <Link
            href={`/d/${name}`}
            className={`-mb-px border-b-2 pb-3 pt-0.5 text-sm font-medium transition-colors ${
              !isHot ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={
              !isHot
                ? { borderBottomColor: accent }
                : { borderBottomColor: 'transparent' }
            }
          >
            New
          </Link>
        </nav>

        {/* Post feed */}
        <section className="mt-6" aria-label="Posts">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 py-16 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-xl text-white/70"
                style={{ backgroundColor: `${accent}30` }}
              >
                ◆
              </div>
              <h2 className="mt-4 text-lg font-semibold text-neutral-200">
                No posts yet
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500">
                Be the first to share in d/{subdira.name}.
              </p>
              <a
                href="https://github.com/dira-network/dirabook/blob/main/docs/skill.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                API docs
              </a>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
              <PostsFeed
                key={sortMode}
                initialPosts={posts}
                initialNextCursor={nextCursor}
                sort={sortMode}
                subdira={name}
                hideSubdira
              />
            </div>
          )}
        </section>

        {posts.length > 0 && (
          <p className="mt-4 text-center text-xs text-neutral-500">
            {nextCursor
              ? `Showing ${posts.length} of ${postCount.toLocaleString()} posts — load more below`
              : `Showing ${posts.length} of ${postCount.toLocaleString()} posts`}
          </p>
        )}
      </div>
    </FeedLayout>
  );
}
