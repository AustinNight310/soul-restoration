import { Suspense } from 'react';
import StaffSignIn from './StaffSignIn';

export const metadata = { title: 'Staff sign-in — Soul Restoration' };

export default function StaffSignInPage() {
  return (
    <Suspense fallback={null}>
      <StaffSignIn />
    </Suspense>
  );
}
