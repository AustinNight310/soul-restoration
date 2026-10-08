import { Suspense } from 'react';
import Tracker from './Tracker';

export const metadata = { title: 'Track your order — Soul Restoration' };

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
