'use client';
// Day / night switch. The choice is saved on this device; a script in the layout applies it before the page paints.
import { useEffect, useState } from 'react';

export default function ThemeSwitch() {
  const [night, setNight] = useState(false);
  useEffect(() => { setNight(document.documentElement.dataset.theme === 'night'); }, []);
  function toggle() {
    const next = !night;
    setNight(next);
    if (next) document.documentElement.dataset.theme = 'night';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('sr-theme', next ? 'night' : 'day'); } catch (e) { /* private mode: still switches for this visit */ }
  }
  return (
    <button type="button" className="mode-switch" role="switch" aria-checked={night} aria-label="Night mode" onClick={toggle}>
      <span className="mode-thumb">
        {night ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        )}
      </span>
    </button>
  );
}
