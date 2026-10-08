import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Soul Restoration — Sneaker restoration in the Bronx',
  description: 'Deep cleaning, icing, reverse oxidation, sole repair, suede care and custom paint. Drop off in the Bronx or request a pickup.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..500&family=Figtree:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
        />
      </head>
      <body>
        <div className="testbar">Test version: no real payments are taken. Sample prices shown.</div>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="wordmark">Soul<span>·</span>Restoration</Link>
            <nav className="nav" aria-label="Main">
              <Link href="/#services" className="link hide-sm">Services</Link>
              <Link href="/track" className="link">Track order</Link>
              <Link href="/book" className="btn primary small">Book</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <span>© 2026 Soul Restoration · Bronx, NY</span>
            <span>Instagram @_soulsneakers_ · Text 347-238-9320</span>
            <Link href="/staff" className="muted">Staff</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
