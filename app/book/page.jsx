import { Suspense } from 'react';
import BookingFlow from './BookingFlow';

export const metadata = { title: 'Book a service — Soul Restoration' };

export default function BookPage() {
  return (
    <Suspense fallback={<p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>}>
      <BookingFlow />
    </Suspense>
  );
}
