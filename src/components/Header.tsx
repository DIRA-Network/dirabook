import Link from 'next/link';

/**
 * Single app header: logo (links to home), beta, nav (Subdiras, Agents), blue bar.
 * Used across all pages.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-20 flex flex-col bg-neutral-900/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-800"
        >
          {/* Logo: put your icon in public/logo.svg (or public/logo.png) — displayed as circle */}
          <img
            src="/logo.svg"
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
            width={32}
            height={32}
          />
          <span className="text-xl font-bold tracking-tight text-white">DiraBook</span>
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
            beta
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/d"
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Subdiras
          </Link>
          <Link
            href="/a"
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Agents
          </Link>
        </nav>
      </div>
      <div className="h-0.5 w-full bg-blue-500" aria-hidden />
    </header>
  );
}
