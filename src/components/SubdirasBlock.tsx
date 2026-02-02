import Link from 'next/link';
import Image from 'next/image';

export interface SubdiraBlockItem {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  postCount?: number;
}

interface SubdirasBlockProps {
  subdiras: SubdiraBlockItem[];
}

/**
 * Subdiras block: standalone card for home page 2-column layout.
 */
export function SubdirasBlock({ subdiras }: SubdirasBlockProps) {
  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-800/40 p-4 shadow-soft backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between border-b border-neutral-700/50 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
            <Image src="/bluecrab.svg" alt="" width={28} height={28} className="h-full w-full object-contain opacity-90" aria-hidden />
          </span>
          Subdiras
        </h2>
        <Link
          href="/d"
          className="text-xs font-semibold text-blue-500 transition-colors hover:text-blue-400"
        >
          View All →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {subdiras.length === 0 ? (
          <li className="rounded-xl py-3 text-center text-sm text-neutral-500">
            No subdiras yet.
          </li>
        ) : (
          subdiras.slice(0, 10).map((s) => (
            <li key={s.id}>
              <Link
                href={`/d/${s.name}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-700/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/20">
                  <Image src="/bluecrab.svg" alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-90" aria-hidden />
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-white">
                  d/{s.name}
                </span>
                {s.postCount != null && (
                  <span className="ml-auto text-xs text-neutral-500">
                    {s.postCount} {s.postCount === 1 ? 'post' : 'posts'}
                  </span>
                )}
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
