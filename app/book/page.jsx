import PairFlow from '../../components/pairflow/PairFlow';

export const metadata = { title: 'Book a service — Soul Sneakers' };

// /book?s=<service> (from the menu) starts the first pair with that service ticked.
export default async function BookPage({ searchParams }) {
  const { s } = await searchParams;
  return (
    <div className="wrap" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="eyebrow">Book</div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', lineHeight: 1.08 }}>Snap your pairs. See your price.</h1>
      </div>
      <PairFlow start={typeof s === 'string' ? s : undefined} />
    </div>
  );
}
