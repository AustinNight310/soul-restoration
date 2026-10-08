import Link from 'next/link';
import BeforeAfter from '../components/BeforeAfter';
import RecentWork from '../components/RecentWork';
import { WORK, REVIEWS } from '../lib/work';
import styles from './home.module.css';

// The home page shows off past work and reviews. Prices, how it works and the FAQ live on /services.
export default function Home() {
  const hasPhotos = WORK.every((w) => w.before && w.after);
  return (
    <>
      <section className={`wrap ${styles.hero}`}>
        <div>
          <div className="eyebrow">Sneaker care, done by hand · Bronx, NY</div>
          <h1 className={styles.title}>Restored.<br /><em>Not replaced.</em></h1>
          <p className={styles.lede}>
            Every pair here came in worn, yellowed or scuffed and went home looking new. Drag the slider to see the difference.
          </p>
          <div className={styles.ctas}>
            <Link href="/book" className="btn primary">Book a service</Link>
            <Link href="/services" className="btn ghost">See services and prices</Link>
          </div>
          <div className={styles.facts}><span>Cleaning since 2020</span><span>Bronx drop-off</span><span>Evening pickup</span></div>
        </div>
        <BeforeAfter item={WORK[0]} />
      </section>

      <section className={styles.section}>
        <div className="wrap">
          <div className="eyebrow">Recent work</div>
          <h2 className={styles.h2}>Before and after.</h2>
          <RecentWork items={WORK.slice(1, 4)} />
          <p className="muted small" style={{ marginTop: 12 }}>
            Tap a pair to flip between before and after.{hasPhotos ? '' : ' Drawings for now; real photos are on the way.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <a className="btn ghost" href="https://instagram.com/_soulsneakers_" target="_blank" rel="noreferrer">More on Instagram @_soulsneakers_</a>
          </div>
        </div>
      </section>

      {REVIEWS.length > 0 && (
        <section className={styles.sectionAlt}>
          <div className="wrap">
            <div className="eyebrow">What customers say</div>
            <h2 className={styles.h2}>Pairs back in rotation.</h2>
            <div className={styles.quotes}>
              {REVIEWS.map((r) => (
                <figure key={r.name + r.quote} className={styles.quote}>
                  <blockquote>“{r.quote}”</blockquote>
                  <figcaption>
                    <strong>{r.name}</strong>
                    {r.pair && <span className="muted small">{r.pair}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={REVIEWS.length > 0 ? styles.section : styles.sectionAlt}>
        <div className={`wrap ${styles.about}`}>
          <div>
            <div className="eyebrow">About</div>
            <h2 className={styles.h2}>Six years of bringing pairs back.</h2>
          </div>
          <div className={styles.aboutText}>
            <p>
              I've been a sneakerhead since the day I was introduced to sneakers, especially Jordans.
              Friends and family put me on to the latest pairs, and I've loved them ever since.
            </p>
            <p>
              I didn't always have the money for brand new sneakers. So I learned to buy used pairs and
              make them look brand new. During the pandemic in 2020 that turned into a side hustle cleaning
              sneakers, and it's grown from there.
            </p>
            <p className="muted">— Criss, Soul Restoration</p>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: 64 }}>
        <div className={styles.band}>
          <div>
            <h2 style={{ fontSize: 30 }}>Got a pair that needs this?</h2>
            <p>Pick services for each pair and see the price before you book.</p>
          </div>
          <div className={styles.ctas} style={{ marginTop: 0 }}>
            <Link href="/book" className="btn primary">Book a service</Link>
            <Link href="/services" className={`btn ghost ${styles.bandGhost}`}>See prices</Link>
          </div>
        </div>
      </section>
    </>
  );
}
