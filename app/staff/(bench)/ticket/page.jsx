import { Suspense } from 'react';
import Ticket from './Ticket';

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Ticket />
    </Suspense>
  );
}
