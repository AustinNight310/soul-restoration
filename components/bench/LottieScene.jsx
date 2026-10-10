'use client';
// Plays one Lottie animation file. Restarts from the top each time its step comes on screen.
import { useEffect, useRef } from 'react';

export default function LottieScene({ src, active, still }) {
  const box = useRef(null);
  const anim = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (cancelled || !box.current) return;
      anim.current = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop: false, autoplay: false, path: src });
    });
    return () => { cancelled = true; anim.current?.destroy(); anim.current = null; };
  }, [src]);

  useEffect(() => {
    const a = anim.current;
    if (!a) return;
    const go = () => {
      if (!active) a.stop();
      else if (still) a.goToAndStop(a.totalFrames - 1, true);
      else a.goToAndPlay(0, true);
    };
    if (a.isLoaded) go(); else a.addEventListener('DOMLoaded', go);
    return () => a.removeEventListener?.('DOMLoaded', go);
  }, [active, still]);

  return <div ref={box} className={`scene lottie${active ? ' on' : ''}`} aria-hidden="true" />;
}
