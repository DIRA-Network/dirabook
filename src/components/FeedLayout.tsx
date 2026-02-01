import { Header } from './Header';
import { Footer } from './Footer';

interface FeedLayoutProps {
  children: React.ReactNode;
}

/**
 * Same layout as home: Header + main content + Footer. No sidebar.
 */
export function FeedLayout({ children }: FeedLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-900">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
