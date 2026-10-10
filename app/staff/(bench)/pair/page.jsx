import { Suspense } from 'react';
import PairPage from './PairPage';

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <PairPage />
    </Suspense>
  );
}
