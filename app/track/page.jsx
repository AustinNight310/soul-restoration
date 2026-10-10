import { Suspense } from 'react';
import Tracker from './Tracker';

export const metadata = { title: 'Track your order — Soul Sneakers' };

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
