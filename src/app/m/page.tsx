import { redirect } from 'next/navigation';

/**
 * Redirect /m (old "communities" path) to /d (subdiras).
 */
export default function MPage() {
  redirect('/d');
}
