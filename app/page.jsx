import Link from 'next/link';
import BeforeAfter from '../components/BeforeAfter';
import Menu from '../components/Menu';
import styles from './home.module.css';

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <div className="wrap">
          <div className="eyebrow">Sneaker care, done by hand · Bronx, NY</div>
          <h1 className={styles.title}>Restored.<br /><em>Not replaced.</em></h1>
          <p className={styles.lede}>
            Deep cleaning, icing, reverse oxidation, sole repair, suede care and custom paint.
            Drop off in the Bronx or request a pickup, then follow every step online.
          </p>
          <div className={styles.ctas}>
            <Link href="/book" className="btn primary">Book a service</Link>
            <Link href="/quote" className="btn ghost">Get a paint quote</Link>
          </div>
          <div className={styles.compare}><BeforeAfter /></div>
        </div>
      </section>

      <section id="services" className={styles.section}>
        <div className="wrap">
          <div className="eyebrow">Services</div>
          <h2 className={styles.h2}>Pick it, see the price, book it.</h2>
          <Menu />
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2 className={styles.h2}>Four steps, start to finish.</h2>
          <ol className={styles.steps}>
            <li><span>01</span><strong>Book online</strong><p>Choose your services, or request a quote for a paint job.</p></li>
            <li><span>02</span><strong>Drop off or we pick up</strong><p>Drop off in the Bronx, or request an evening pickup after 5pm.</p></li>
            <li><span>03</span><strong>Restored by hand</strong><p>Every pair is inspected first. If it needs more work, we ask before doing anything.</p></li>
            <li><span>04</span><strong>Back to you</strong><p>Track every stage with your order number until it's ready for pickup.</p></li>
          </ol>
        </div>
      </section>

      <section className={styles.section}>
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

      <section className={styles.sectionAlt}>
        <div className="narrow">
          <div className="eyebrow">Questions</div>
          <h2 className={styles.h2}>Good to know.</h2>
          <div className={styles.faq}>
            <details open>
              <summary>How long does it take?</summary>
              <p>It depends on the service and how many pairs are ahead of yours. You'll see an estimate when you book, and you can track your order the whole way.</p>
            </details>
            <details>
              <summary>Where do I drop off?</summary>
              <p>In the Bronx. The exact address and hours are sent as soon as you book.</p>
            </details>
            <details>
              <summary>Can you pick my shoes up?</summary>
              <p>Yes, in the evenings after 5pm. Request a pickup when you book and we'll text you to confirm the time.</p>
            </details>
            <details>
              <summary>What if my pair needs more work than I booked?</summary>
              <p>We inspect every pair first and contact you before doing anything extra.</p>
            </details>
            <details>
              <summary>Do you work on older pairs?</summary>
              <p>Usually, yes. Some pairs from the '80s and '90s use materials that don't glue or restore reliably, so we'll tell you honestly what to expect after we look at them.</p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
