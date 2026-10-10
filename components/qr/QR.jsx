'use client';
// A QR code as crisp SVG (prints sharp at any size). `value` is the link it opens.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QR({ value, size = 120, label }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => { if (live) setSvg(s); });
    return () => { live = false; };
  }, [value]);
  return (
    <div role="img" aria-label={label || 'QR code'} style={{ width: size, height: size, background: '#fff', flex: 'none' }}
      // the library builds this SVG from the link text; nothing user-written goes in unescaped
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
