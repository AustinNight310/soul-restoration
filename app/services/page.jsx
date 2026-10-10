import Menu from '../../components/Menu';
import PairFlow from '../../components/pairflow/PairFlow';
import styles from '../home.module.css';

export const metadata = { title: 'Services and prices — Soul Sneakers' };

export default function ServicesPage() {
  return (
    <>
      <section className={styles.section} style={{ paddingBottom: 28 }}>
        <div className="wrap">
          <div className="eyebrow">Services</div>
          <h1 className={styles.h2} style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: 0 }}>Snap your pairs. See your price.</h1>
          <p className={styles.lede}>
            One pair at a time: a few photos, what’s wrong, the size. Your price adds up as you go, bundles included.
            We double-check the photos before anything is charged.
          </p>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 72 }}>
        <PairFlow />
      </section>

      <section className="wrap" style={{ paddingBottom: 64 }}>
        <div className="eyebrow">All services</div>
        <h2 className={styles.h2}>What we do, and what it costs.</h2>
        <Menu />
      </section>

      <section className={styles.sectionAlt}>
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2 className={styles.h2}>Four steps, start to finish.</h2>
          <ol className={styles.steps}>
            <li><span>01</span><strong>Snap a pair</strong><p>Side, top and sole. Tick what’s wrong and add the size.</p></li>
            <li><span>02</span><strong>See your price</strong><p>It adds up as you go. Bundle savings come off on their own.</p></li>
            <li><span>03</span><strong>Drop off or we pick up</strong><p>Drop off in the Bronx, or an evening pickup after 5pm. We check the photos first.</p></li>
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
              <summary>Is the price on screen final?</summary>
              <p>It’s what you pay unless we spot something in your photos. If we do, you hear before you pay. Paint and “not sure” pairs are always priced after we see the photos.</p>
            </details>
            <details>
              <summary>How long does it take?</summary>
              <p>It depends on the service and how many pairs are ahead of yours. You'll see an estimate when you book, and you can track your order the whole way.</p>
            </details>
            <details>
              <summary>Where do I drop off?</summary>
              <p>In the Bronx. The exact address and hours are sent as soon as you book.</p>
            </details>
            <details>
              <summary>Can you pick my shoes up?</summary>
              <p>Yes, in the evenings after 5pm. Choose pickup when you book and we'll text you to confirm the time.</p>
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
