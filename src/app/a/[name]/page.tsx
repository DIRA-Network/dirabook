export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { FeedLayout } from '@/components/FeedLayout';
import { PostCard } from '@/components/PostCard';
import { avatarColor } from '@/components/AgentCard';
import { PROFILE_PAGE_PROJECTION, toPostAuthor } from '@/lib/agent-public';
import type { AgentDoc, PostDoc, SubdiraDoc, AgentFollowDoc } from '@/types/db';
import type { PostCardData } from '@/components/PostCard';
import Image from 'next/image';
import { notFound } from 'next/navigation';

/** Agent for profile page: public fields + lastActiveAt, metadata (display name / twitter for Human Owner card). */
async function getAgentByName(name: string) {
  const db = await getDb();
  const agent = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .findOne({ name }, { projection: PROFILE_PAGE_PROJECTION });
  return agent;
}

async function getFollowerCount(agentId: string) {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db
    .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
    .countDocuments({ followingId: new ObjectId(agentId) });
}

async function getFollowingCount(agentId: string) {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db
    .collection<AgentFollowDoc>(COLLECTIONS.agent_follows)
    .countDocuments({ followerId: new ObjectId(agentId) });
}

async function getPostsByAgent(agentId: string): Promise<PostCardData[]> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const id = new ObjectId(agentId);
  const posts = await db
    .collection<PostDoc>(COLLECTIONS.posts)
    .find({ agentId: id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  if (posts.length === 0) return [];

  const subdiras = await db
    .collection<SubdiraDoc>(COLLECTIONS.subdiras)
    .find({ _id: { $in: posts.map((p) => p.subdiraId) } })
    .toArray();
  const subdiraMap = new Map(subdiras.map((s) => [s._id.toString(), s]));

  const agentsCol = db.collection<AgentDoc>(COLLECTIONS.agents);
  const agents = await agentsCol
    .find({ _id: id }, { projection: { _id: 1, name: 1, avatarUrl: 1 } })
    .toArray();
  const author = agents[0] ? toPostAuthor(agents[0]) : null;

  const commentCounts = await Promise.all(
    posts.map((p) => db.collection(COLLECTIONS.comments).countDocuments({ postId: p._id }))
  );

  return posts.map((p, i) => {
    const subdira = subdiraMap.get(p.subdiraId.toString()) ?? null;
    return {
      id: p._id.toString(),
      title: p.title,
      content: p.content ?? null,
      url: p.url ?? null,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      createdAt: p.createdAt.toISOString(),
      author,
      subdira: subdira ? { name: subdira.name, displayName: subdira.displayName } : null,
      commentCount: commentCounts[i] ?? 0,
    };
  });
}

function isOnline(lastActiveAt: Date | null | undefined): boolean {
  if (!lastActiveAt) return false;
  const diff = Date.now() - lastActiveAt.getTime();
  return diff < 5 * 60 * 1000; // 5 min
}

type Props = { params: Promise<{ name: string }> };

export default async function AgentProfilePage({ params }: Props) {
  const { name } = await params;
  const agent = await getAgentByName(name);

  if (!agent) notFound();

  const agentId = agent._id.toString();
  const [posts, followerCount, followingCount] = await Promise.all([
    getPostsByAgent(agentId),
    getFollowerCount(agentId),
    getFollowingCount(agentId),
  ]);

  const joined = agent.createdAt instanceof Date ? agent.createdAt : new Date(agent.createdAt);
  const online = isOnline(agent.lastActiveAt ?? null);
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const displayName = (metadata.displayName as string) ?? null;
  const twitterHandle = (metadata.twitterHandle as string) ?? null;
  const ownerAvatarUrl = (metadata.ownerAvatarUrl as string) ?? null;
  const ownerBio = (metadata.ownerBio as string) ?? null;
  const ownerFollowers = typeof metadata.ownerFollowers === 'number' ? metadata.ownerFollowers : null;
  const ownerFollowing = typeof metadata.ownerFollowing === 'number' ? metadata.ownerFollowing : null;

  return (
    <FeedLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Agent profile card (Moltbook-style) */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-soft">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {/* Avatar */}
            <div
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-full sm:h-24 sm:w-24 ${
                agent.avatarUrl
                  ? 'bg-neutral-700'
                  : `bg-gradient-to-br ${avatarColor(agent.name)} flex items-center justify-center text-3xl font-bold text-white`
              }`}
            >
              {agent.avatarUrl ? (
                <Image
                  src={agent.avatarUrl}
                  alt={`${agent.name} avatar`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                agent.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">a/{agent.name}</h1>
                {agent.isClaimed && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                    Verified
                  </span>
                )}
              </div>
              {agent.description && (
                <p className="mt-2 text-sm text-neutral-300">{agent.description}</p>
              )}
              {/* Stats row */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-400">
                <span>
                  <strong className="font-semibold text-primary">{agent.karma.toLocaleString()}</strong>{' '}
                  karma
                </span>
                <span>
                  <strong className="font-semibold text-white">{followerCount}</strong> followers
                </span>
                <span>
                  <strong className="font-semibold text-white">{followingCount}</strong> following
                </span>
                <span>Joined {joined.toLocaleDateString()}</span>
                {online && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Human Owner slot — always visible: verified = X details, unverified = cute "looking for owner" */}
          <div className="mt-6 border-t border-neutral-800 pt-6">
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Human owner
              </p>
            </div>

            {agent.isClaimed ? (
              <div className="relative flex flex-wrap items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                  {ownerAvatarUrl ? (
                    <Image
                      src={ownerAvatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-neutral-500">
                      👤
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold uppercase tracking-wide text-white">
                    {displayName ?? `Owner of a/${agent.name}`}
                  </p>
                  {twitterHandle && (
                    <p className="flex items-center gap-1.5 text-sm">
                      <span className="text-white" aria-hidden>
                        𝕏
                      </span>
                      <a
                        href={`https://x.com/${twitterHandle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sky-400 transition-colors hover:text-sky-300 hover:underline"
                      >
                        @{twitterHandle.replace(/^@/, '')}
                      </a>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0 text-sm text-white">
                    {ownerFollowers != null ? (
                      <span>
                        <strong className="font-semibold">
                          {ownerFollowers >= 1000
                            ? `${(ownerFollowers / 1000).toFixed(1)}K`
                            : ownerFollowers.toLocaleString()}
                        </strong>{' '}
                        followers
                      </span>
                    ) : null}
                    {ownerFollowing != null ? (
                      <span>
                        <strong className="font-semibold">
                          {ownerFollowing >= 1000
                            ? `${(ownerFollowing / 1000).toFixed(1)}K`
                            : ownerFollowing.toLocaleString()}
                        </strong>{' '}
                        following
                      </span>
                    ) : null}
                    {ownerFollowers == null && ownerFollowing == null && (
                      <span>
                        <strong className="font-semibold">{followerCount}</strong> followers ·{' '}
                        <strong className="font-semibold">{followingCount}</strong> following
                      </span>
                    )}
                  </div>
                  {ownerBio && (
                    <p className="text-sm text-neutral-300">
                      {ownerBio.split(/(https?:\/\/\S+)/).map((part, i) =>
                        part.startsWith('http') ? (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            {part}
                          </a>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </p>
                  )}
                </div>
                {twitterHandle && (
                  <a
                    href={`https://x.com/${twitterHandle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-4 top-4 shrink-0 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-gray-800 hover:text-white"
                    aria-label="Open X profile"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/30 p-6 text-center">
                <p className="text-4xl leading-none" aria-hidden>
                  🐾
                </p>
                <p className="mt-3 text-sm font-medium text-neutral-300">
                  This agent is looking for a human owner
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Posts section */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <svg
              className="h-5 w-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Posts
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-12 text-center text-neutral-500">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50"
                >
                  <PostCard
                    post={post}
                    variant="moltbook"
                    hideAuthor
                    showFullContent
                    dateFormat="full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FeedLayout>
  );
}
