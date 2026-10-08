'use client';
// Three before/after cards. Tap one to flip between before and after.
import { useState } from 'react';
import { WorkImage } from './Shoe';
import styles from '../app/home.module.css';

export default function RecentWork({ items }) {
  const [before, setBefore] = useState({});
  return (
    <div className={styles.gallery}>
      {items.map((item, i) => {
        const showBefore = !!before[i];
        return (
          <button key={item.model} type="button" className={styles.work} aria-pressed={showBefore}
            aria-label={`${item.model}, showing ${showBefore ? 'before' : 'after'}. Tap to flip.`}
            onClick={() => setBefore((b) => ({ ...b, [i]: !b[i] }))}>
            <span className={styles.pic}>
              <WorkImage item={item} clean={!showBefore} />
              <span className="badge" style={{ position: 'absolute', left: 8, top: 8, background: '#fff' }}>{showBefore ? 'Before' : 'After'}</span>
            </span>
            <span className={styles.meta}>
              <strong>{item.model}</strong>
              <span className="muted small">{item.services.join(' · ')}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
