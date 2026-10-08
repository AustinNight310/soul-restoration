'use client';
// Main navigation. Highlights the page you're on.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Our work' },
  { href: '/services', label: 'Services' },
  { href: '/track', label: 'Track order' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="link" aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>
      ))}
      <Link href="/book" className="btn primary small">Book</Link>
    </nav>
  );
}
