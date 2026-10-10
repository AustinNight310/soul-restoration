import Link from 'next/link';
import BeforeAfter from '../components/BeforeAfter';
import RecentWork from '../components/RecentWork';
import Bench from '../components/bench/Bench';
import { WORK, REVIEWS } from '../lib/work';
import styles from './home.module.css';

// The home page is a showroom: the work on display first, then the story around it.
// Prices, how it works and the FAQ live on /services.
export default function Home() {
  const hasPhotos = WORK.every((w) => w.before && w.after);
  return (
    <>
      <section className={styles.stage}>
        <div className={styles.display}><BeforeAfter item={WORK[0]} /></div>
        <div className={`wrap ${styles.intro}`}>
          <h1>Restored.<br /><em>Not replaced.</em></h1>
          <div className={styles.copy}>
            <p>Hand restoration for the pairs you can't replace. Every shoe is inspected, cleaned and finished by one set of hands in the Bronx, and you can follow it the whole way.</p>
            <div className={styles.ctas}>
              <Link href="/book" className="btn primary">Book a restoration</Link>
              <Link href="/services" className="btn ghost">Services and prices</Link>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.promises}>
        <ul className={`wrap ${styles.label}`}>
          <li>Restoring since 2020</li><li>Inspected before any work</li><li>Track every stage online</li><li>Bronx drop-off or evening pickup</li>
        </ul>
      </div>

      <section className={styles.section}>
        <div className="wrap">
          <div className={styles.head2}>
            <div><div className="eyebrow">The collection</div><h2>Recent pairs, back in rotation.</h2></div>
            <p>Tap a pair to see how it came in.{hasPhotos ? '' : ' Drawings for now; real photos are on the way.'}</p>
          </div>
          <RecentWork items={WORK.slice(1, 4)} />
          <div className={styles.ig}>
            <a className="btn ghost" href="https://www.instagram.com/_soulsneakers__/" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              See more on Instagram
            </a>
          </div>
        </div>
      </section>

      <section className={`${styles.section} bench`}>
        <div className="wrap">
          <div className={styles.head2}>
            <div><div className="eyebrow">At the bench</div><h2>Where your pair goes, start to finish.</h2></div>
            <p>From the moment it leaves your hands to the moment it's back. No guesswork: every step shows up on your tracking page.</p>
          </div>
          <Bench />
        </div>
      </section>

      <section className={styles.section}>
        <div className={`wrap ${styles.maker}`}>
          <div className="eyebrow">The maker</div>
          <div className={styles.mark} aria-hidden="true">“</div>
          <blockquote>I didn't always have the money for brand new sneakers. So I learned to buy used pairs and make them look <em>brand new</em>.</blockquote>
          <div className={styles.sig}><strong>Criss</strong><span>Founder, Soul Sneakers</span></div>
          <p className={styles.story}>A sneakerhead from the first pair of Jordans. During the pandemic in 2020 that turned into a side hustle cleaning sneakers, and it's grown from there.</p>
        </div>
      </section>

      {REVIEWS.length > 0 && (
        <section className={`${styles.section} ${styles.reviews}`}>
          <div className="wrap">
            <div className={styles.head2}><div><div className="eyebrow">In their words</div><h2>From people who've picked up.</h2></div></div>
            <div className={styles.quotes}>
              {REVIEWS.map((r) => (
                <figure key={r.name + r.quote} className={styles.quote}>
                  <blockquote>“{r.quote}”</blockquote>
                  <figcaption><strong>{r.name}</strong>{r.pair && <span className="muted small">{r.pair}</span>}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`${styles.section} ${styles.invite}`}>
        <div className="wrap">
          <h2>Your pair is <em>next.</em></h2>
          <p>Add each pair, pick what it needs and see the price before you book. Drop off in the Bronx or we'll pick up.</p>
          <div className={styles.ctas} style={{ justifyContent: 'center' }}>
            <Link href="/book" className="btn primary">Book a restoration</Link>
            <Link href="/services" className="btn ghost">See prices</Link>
          </div>
        </div>
      </section>
    </>
  );
}
