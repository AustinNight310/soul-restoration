'use client';
// The pair on display at the top of the home page: drag to compare before and after.
import { useState } from 'react';
import { WorkImage } from './Shoe';
import styles from '../app/home.module.css';

export default function BeforeAfter({ item }) {
  const [pos, setPos] = useState(52);
  return (
    <div>
      <div className={styles.compare}>
        <WorkImage item={item} clean={false} viewBox="-80 -40 464 220" />
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <WorkImage item={item} clean viewBox="-80 -40 464 220" />
        </div>
        <div className={styles.rule} style={{ left: `${pos}%` }} />
        <div className={styles.knob} style={{ left: `${pos}%` }} aria-hidden="true">⟷</div>
        <span className={styles.side} style={{ left: 16 }}>After</span>
        <span className={styles.side} style={{ right: 16 }}>Before</span>
        <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Drag to compare before and after" />
      </div>
      <div className={styles.plaque}>
        <strong>{item.model}</strong>
        <span className={styles.label}>{item.services.join(' · ')}</span>
      </div>
    </div>
  );
}
