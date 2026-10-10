import { Suspense } from 'react';
import Account from './Account';

export const metadata = { title: 'Your account — Soul Sneakers' };

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>}>
      <Account />
    </Suspense>
  );
}
