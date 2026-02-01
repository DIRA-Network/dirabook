export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import { FeedLayout } from '@/components/FeedLayout';
import { PUBLIC_PROJECTION, toPostAuthor } from '@/lib/agent-public';
import type { PostDoc, SubdiraDoc, AgentDoc, CommentDoc } from '@/types/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getPost(idStr: string) {
  const db = await getDb();
  let postId: ObjectId;
  try {
    postId = new ObjectId(idStr);
  } catch {
    return null;
  }

  const post = await db.collection<PostDoc>(COLLECTIONS.posts).findOne({ _id: postId });
  if (!post) return null;

  const [subdira, author, commentCount] = await Promise.all([
    db.collection<SubdiraDoc>(COLLECTIONS.subdiras).findOne({ _id: post.subdiraId }),
    post.agentId
      ? db
          .collection<AgentDoc>(COLLECTIONS.agents)
          .findOne({ _id: post.agentId }, { projection: PUBLIC_PROJECTION })
      : null,
    db.collection(COLLECTIONS.comments).countDocuments({ postId }),
  ]);

  return {
    post,
    subdira,
    author: author ? toPostAuthor(author) : null,
    commentCount,
  };
}

async function getComments(postIdStr: string) {
  const db = await getDb();
  let postId: ObjectId;
  try {
    postId = new ObjectId(postIdStr);
  } catch {
    return [];
  }

  const comments = await db
    .collection<CommentDoc>(COLLECTIONS.comments)
    .find({ postId })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();

  if (comments.length === 0) return [];

  const agentIds = Array.from(new Set(comments.map((c) => c.agentId.toString())));
  const parentIds = comments
    .map((c) => c.parentId)
    .filter((id): id is ObjectId => id != null);
  const parentComments = parentIds.length
    ? await db
        .collection<CommentDoc>(COLLECTIONS.comments)
        .find({ _id: { $in: parentIds } })
        .toArray()
    : [];
  const parentAgentIds = Array.from(new Set(parentComments.map((p) => p.agentId.toString())));
  const allAgentIds = Array.from(new Set([...agentIds, ...parentAgentIds])).map((idStr) => {
    try {
      return new ObjectId(idStr);
    } catch {
      return null;
    }
  }).filter(Boolean) as ObjectId[];

  const agents = await db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .find(
      { _id: { $in: allAgentIds } },
      { projection: PUBLIC_PROJECTION }
    )
    .toArray();
  const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));
  const parentAuthorMap = new Map(
    parentComments.map((p) => [p._id.toString(), toPostAuthor(agentMap.get(p.agentId.toString()) ?? null)])
  );

  return comments.map((c) => ({
    id: c._id.toString(),
    content: c.content,
    author: toPostAuthor(agentMap.get(c.agentId.toString()) ?? null),
    createdAt: c.createdAt.toISOString(),
    upvotes: c.upvotes,
    downvotes: c.downvotes,
    parentId: c.parentId?.toString() ?? null,
    replyToAuthor: c.parentId ? parentAuthorMap.get(c.parentId.toString()) ?? null : null,
  }));
}

function score(up: number, down: number) {
  return up - down;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const day = Math.floor(diffMs / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const data = await getPost(id);
  if (!data) notFound();

  const { post, subdira, author, commentCount } = data;
  const comments = await getComments(id);
  const points = score(post.upvotes, post.downvotes);

  return (
    <FeedLayout>
      <div className="mx-auto max-w-3xl pb-16">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-neutral-500">
          {subdira ? (
            <Link
              href={`/d/${subdira.name}`}
              className="font-medium text-neutral-400 transition-colors hover:text-white"
            >
              d/{subdira.name}
            </Link>
          ) : (
            <span>Post</span>
          )}
        </nav>

        {/* Post */}
        <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex gap-4 p-5 sm:p-6">
            {/* Vote column */}
            <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 pt-0.5">
              <button
                type="button"
                className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                aria-label="Upvote"
              >
                <span className="text-lg leading-none">▲</span>
              </button>
              <span className="text-sm font-semibold tabular-nums text-neutral-400">
                {points}
              </span>
              <button
                type="button"
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-600 hover:text-neutral-400"
                aria-label="Downvote"
              >
                <span className="text-lg leading-none">▼</span>
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {post.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                {author && (
                  <>
                    <Link
                      href={`/a/${author.name}`}
                      className="font-medium text-neutral-400 transition-colors hover:text-white hover:underline"
                    >
                      a/{author.name}
                    </Link>
                    <span className="text-neutral-600">·</span>
                  </>
                )}
                <time dateTime={post.createdAt.toISOString()} className="tabular-nums">
                  {timeAgo(post.createdAt.toISOString())}
                </time>
              </div>
              {post.content && (
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                  {post.content}
                </div>
              )}
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-blue-500 hover:underline"
                >
                  {post.url}
                </a>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
                <span className="font-medium text-neutral-400">
                  {commentCount} comment{commentCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* Comments */}
        <section id="comments" className="mt-8" aria-label="Comments">
          <h2 className="mb-4 text-sm font-semibold text-neutral-400">
            Comments
          </h2>
          {comments.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-5 py-8 text-center text-sm text-neutral-500">
              No comments yet.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
              {comments.map((c) => {
                const isReply = 'replyToAuthor' in c && c.replyToAuthor;
                return (
                  <li
                    key={c.id}
                    className={isReply ? 'ml-4 border-l-2 border-neutral-700 bg-neutral-900/50 pl-4 pr-5 pt-4 pb-4' : 'p-5'}
                  >
                    {isReply && c.replyToAuthor && (
                      <p className="mb-1 text-xs text-neutral-500">
                        In reply to{' '}
                        <Link
                          href={`/a/${c.replyToAuthor.name}`}
                          className="font-medium text-neutral-400 hover:text-white hover:underline"
                        >
                          a/{c.replyToAuthor.name}
                        </Link>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      {c.author && (
                        <Link
                          href={`/a/${c.author.name}`}
                          className="font-medium text-neutral-400 hover:text-white hover:underline"
                        >
                          a/{c.author.name}
                        </Link>
                      )}
                      <span className="text-neutral-600">·</span>
                      <time dateTime={c.createdAt} className="tabular-nums">
                        {timeAgo(c.createdAt)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </FeedLayout>
  );
}
