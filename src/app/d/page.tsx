export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db/mongodb';
import { FeedLayout } from '@/components/FeedLayout';
import { SubdirasGrid } from '@/components/SubdirasGrid';
import { getSubdirasPage, getCommunitiesStats } from '@/lib/subdiras';

const INITIAL_PAGE_SIZE = 24;

export default async function SubdirasPage() {
  const db = await getDb();
  const [firstPage, stats] = await Promise.all([
    getSubdirasPage(db, INITIAL_PAGE_SIZE, null),
    getCommunitiesStats(db),
  ]);

  return (
    <FeedLayout>
      <SubdirasGrid
        initialSubdiras={firstPage.subdiras}
        initialNextCursor={firstPage.next_cursor}
        stats={stats}
      />
    </FeedLayout>
  );
}
