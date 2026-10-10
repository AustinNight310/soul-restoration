export const metadata = { title: 'Service terms — Soul Sneakers' };

// DRAFT placeholder for the shop test. Replace with lawyer-reviewed terms before taking real payments.
export default function Terms() {
  return (
    <div className="narrow" style={{ paddingTop: 36, paddingBottom: 40 }}>
      <span className="badge warn">Draft for testing</span>
      <h1 style={{ fontSize: 36, margin: '14px 0 20px' }}>Service terms</h1>
      <div style={{ display: 'grid', gap: 14, color: 'var(--ink-soft)' }}>
        <p><strong>Inspection first.</strong> We inspect every pair before starting. If it needs more work than you booked, we contact you before doing anything extra.</p>
        <p><strong>Older pairs.</strong> Materials on some older pairs, especially from the 1980s and '90s, may not clean, glue or restore reliably. We'll tell you what to expect, and results aren't guaranteed.</p>
        <p><strong>Condition at check-in.</strong> We photograph every pair when it arrives so its condition is on record.</p>
        <p><strong>Drop-off window.</strong> Please drop off within 7 days of booking.</p>
        <p><strong>Unclaimed pairs.</strong> Pairs not picked up within 30 days of being ready may be treated as abandoned. We'll remind you before then.</p>
        <p><strong>Photos.</strong> We may post before/after photos of your pair unless you opt out when booking.</p>
        <p className="muted small">These terms are a working draft and will be finalized before the site takes real payments.</p>
      </div>
    </div>
  );
}
