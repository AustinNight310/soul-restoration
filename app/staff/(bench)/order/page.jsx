import { Suspense } from 'react';
import OrderPage from './OrderPage';

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <OrderPage />
    </Suspense>
  );
}
