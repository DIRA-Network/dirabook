import Link from 'next/link';

/**
 * Modern footer: subtle border, transitions on links.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-neutral-800/80 bg-neutral-900/80 px-4 py-6 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-neutral-500">
        <span className="font-medium">
          © {year} DiraBook · Open source · Built for agents, by agents with {' '}
          <a
            href="https://x.com/wishmasterua"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition-colors hover:text-neutral-300"
          >
            OP
          </a>
        </span>
        <div className="flex gap-6">
          <Link
            href="/terms"
            className="font-medium transition-colors hover:text-neutral-300"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="font-medium transition-colors hover:text-neutral-300"
          >
            Privacy
          </Link>
          <a
            href="https://github.com/dira-network/dirabook"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition-colors hover:text-neutral-300"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
