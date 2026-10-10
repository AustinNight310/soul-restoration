'use client';
// "At the bench": one pair's trip in six steps. Plays once the section is on screen,
// pauses on request; the arrows or the progress bar jump to any step.
import { useEffect, useRef, useState } from 'react';
import { STEPS, DWELL_MS } from '../../lib/bench';
import { SCENES, SNEAKER_DEFS } from './scenes';
import LottieScene from './LottieScene';
import './bench.css';

export default function Bench() {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const stage = useRef(null);
  const proc = useRef(null);
  const bars = useRef([]);
  const inView = useRef(false);
  const prog = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce) setPlaying(false);
    const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting; }, { threshold: 0.35 });
    io.observe(proc.current);
    return () => io.disconnect();
  }, []);

  // switch the drawn scene and restart its animations from the top
  useEffect(() => {
    prog.current = 0;
    const scenes = [...stage.current.querySelectorAll('.scene.drawn')];
    scenes.forEach((sc) => sc.classList.remove('on'));
    void stage.current.offsetWidth;
    stage.current.querySelector(`.scene.drawn[data-i="${cur}"]`)?.classList.add('on');
    bars.current.forEach((b, j) => { if (b) b.style.width = j < cur ? '100%' : '0'; });
  }, [cur]);

  useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = now - last; last = now;
      if (playing && inView.current) {
        prog.current = Math.min(1, prog.current + dt / DWELL_MS);
        if (bars.current[cur]) bars.current[cur].style.width = `${prog.current * 100}%`;
        if (prog.current >= 1) { setCur((c) => (c + 1) % STEPS.length); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, cur]);

  const step = STEPS[cur];
  const go = (d) => setCur((c) => (c + d + STEPS.length) % STEPS.length);
  return (
    <div className="process" ref={proc}>
      <div className={`bench-stage${still ? ' still' : ''}`} ref={stage}>
        <div dangerouslySetInnerHTML={{ __html: SNEAKER_DEFS }} />
        {STEPS.map((st, i) => (st.lottie
          ? <LottieScene key={i} src={st.lottie} active={i === cur} still={still} />
          : <div key={i} className="scene drawn" data-i={i} dangerouslySetInnerHTML={{ __html: SCENES[i].replace('class="scene ill"', 'class="ill" style="width:100%;height:100%;display:block"') }} />))}
      </div>
      <div className="bench-side">
        <div className="steps" role="tablist" aria-label="Steps">
          {STEPS.map((st, i) => (
            <button key={st.n} type="button" role="tab" aria-selected={i === cur} aria-label={`Step ${i + 1}: ${st.title}`} onClick={() => setCur(i)}>
              <i ref={(el) => { bars.current[i] = el; }} />
            </button>
          ))}
        </div>
        <div className="panel" role="tabpanel" aria-live="polite">
          <div className="label">Step {cur + 1} of {STEPS.length}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </div>
        <div className="controls">
          <button type="button" className="round" aria-label="Previous step" onClick={() => go(-1)}>←</button>
          <button type="button" className="round" aria-label="Next step" onClick={() => go(1)}>→</button>
          {!still && <button type="button" className="play" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>}
        </div>
      </div>
    </div>
  );
}
