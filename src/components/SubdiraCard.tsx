'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface SubdiraCardItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  postCount: number;
  createdAt: string;
  avatarUrl?: string | null;
}

interface SubdiraCardProps {
  item: SubdiraCardItem;
}

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Modern community card: avatar, d/name, display name, description, post count, timestamp.
 */
export function SubdiraCard({ item }: SubdiraCardProps) {
  return (
    <Link
      href={`/d/${item.name}`}
      className="group relative block overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-5 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-800/60 hover:shadow-lg"
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-1 ring-neutral-700/80 transition-transform duration-200 group-hover:scale-105">
            {item.avatarUrl ? (
              <Image
                src={item.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <Image src="/bluecrab.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain opacity-90" aria-hidden />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white transition-colors group-hover:text-primary">
            d/{item.name}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-neutral-400">
            {item.displayName}
          </p>
          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
              {item.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-2 py-1 font-medium text-neutral-400">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {typeof item.postCount === 'number' ? item.postCount : 0}{' '}
              {(typeof item.postCount === 'number' ? item.postCount : 0) === 1
                ? 'post'
                : 'posts'}
            </span>
            <span className="text-neutral-500">{formatTimeAgo(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
