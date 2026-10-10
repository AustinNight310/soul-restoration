import './globals.css';
import Link from 'next/link';
import Nav from '../components/Nav';
import ThemeSwitch from '../components/ThemeSwitch';
import AccountButton from '../components/AccountButton';
import { AuthProvider } from '../lib/auth';

export const metadata = {
  title: 'Soul Restoration — Sneaker restoration in the Bronx',
  description: 'Deep cleaning, icing, reverse oxidation, sole repair, suede care and custom paint. Drop off in the Bronx or request a pickup.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('sr-theme')==='night')document.documentElement.dataset.theme='night'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..500&family=Figtree:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
        />
      </head>
      <body>
        <AuthProvider>
          <div className="testbar">Test version: no real payments are taken. Sample prices shown.</div>
          <header className="site-head">
            <div className="wrap">
              <Link href="/" className="wordmark">Soul<span>·</span>Restoration</Link>
              <Nav />
              <AccountButton />
              <ThemeSwitch />
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-foot">
            <div className="wrap">
              <span>© 2026 Soul Restoration · Bronx, NY</span>
              <span><a href="https://www.instagram.com/_soulsneakers__/" target="_blank" rel="noreferrer">Instagram @_soulsneakers__</a> · Text 347-238-9320</span>
              <Link href="/staff" className="muted">Staff</Link>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
