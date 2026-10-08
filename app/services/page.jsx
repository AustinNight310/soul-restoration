import Menu from '../../components/Menu';
import styles from '../home.module.css';

export const metadata = { title: 'Services and prices — Soul Restoration' };

export default function ServicesPage() {
  return (
    <>
      <section className={styles.section} style={{ paddingBottom: 32 }}>
        <div className="wrap">
          <div className="eyebrow">Services</div>
          <h1 className={styles.h2} style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>What we do, and what it costs.</h1>
          <p className={styles.lede} style={{ marginTop: 0 }}>
            Prices are per pair. Mix services on each pair when you book, and deep cleans get bundle pricing automatically.
          </p>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 64 }}>
        <Menu />
      </section>

      <section className={styles.sectionAlt}>
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2 className={styles.h2}>Four steps, start to finish.</h2>
          <ol className={styles.steps}>
            <li><span>01</span><strong>Book online</strong><p>Add each pair and pick what it needs, or request a quote for a paint job.</p></li>
            <li><span>02</span><strong>Drop off or we pick up</strong><p>Drop off in the Bronx, or request an evening pickup after 5pm.</p></li>
            <li><span>03</span><strong>Restored by hand</strong><p>Every pair is inspected first. If it needs more work, we ask before doing anything.</p></li>
            <li><span>04</span><strong>Back to you</strong><p>Track every stage with your order number until it's ready for pickup.</p></li>
          </ol>
        </div>
      </section>

      <section className={styles.section}>
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
