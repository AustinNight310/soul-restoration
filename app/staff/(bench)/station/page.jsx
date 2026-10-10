import { Suspense } from 'react';
import StationPage from './StationPage';

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <StationPage />
    </Suspense>
  );
}
