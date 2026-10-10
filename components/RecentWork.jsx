'use client';
// The collection: three pairs. Tap one to see how it came in.
import { useState } from 'react';
import { WorkImage } from './Shoe';
import styles from '../app/home.module.css';

export default function RecentWork({ items }) {
  const [before, setBefore] = useState({});
  return (
    <div className={styles.pieces}>
      {items.map((item, i) => {
        const showBefore = !!before[i];
        return (
          <button key={item.model} type="button" className={styles.piece} aria-pressed={showBefore}
            aria-label={`${item.model}, showing ${showBefore ? 'before' : 'after'}. Tap to flip.`}
            onClick={() => setBefore((b) => ({ ...b, [i]: !b[i] }))}>
            <span className={styles.frame}>
              <WorkImage item={item} clean={!showBefore} viewBox="-20 -20 344 180" />
              <span className={styles.flip}>{showBefore ? 'Before' : 'After'}</span>
            </span>
            <span className={styles.info}>
              <span className={styles.pieceName}>{item.model}</span>
              <span className={styles.work}>{item.services.join(' · ')}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
