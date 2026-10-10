import { Suspense } from 'react';
import Search from './Search';

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Search />
    </Suspense>
  );
}
