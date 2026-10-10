import { Suspense } from 'react';
import CustomerSignIn from './CustomerSignIn';

export const metadata = { title: 'Sign in — Soul Sneakers' };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <CustomerSignIn />
    </Suspense>
  );
}
