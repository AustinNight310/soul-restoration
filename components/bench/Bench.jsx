'use client';
// "At the bench": one pair's trip in six steps. Plays once the section is on screen,
// pauses on request, and any step can be opened by tapping it.
import { useEffect, useRef, useState } from 'react';
import { STEPS, TRACK, DWELL_MS } from '../../lib/bench';
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
  return (
    <div className="process" ref={proc}>
      <div>
        <div className={`bench-stage${still ? ' still' : ''}`} ref={stage}>
          <div dangerouslySetInnerHTML={{ __html: SNEAKER_DEFS }} />
          {STEPS.map((st, i) => (st.lottie
            ? <LottieScene key={i} src={st.lottie} active={i === cur} still={still} />
            : <div key={i} className="scene drawn" data-i={i} dangerouslySetInnerHTML={{ __html: SCENES[i].replace('class="scene ill"', 'class="ill" style="width:100%;height:100%;display:block"') }} />))}
          <span className="step-tag"><b>{step.n}</b><span>{step.title}</span></span>
        </div>
        <div className="trackline">
          <span className="label">What your tracking page shows</span>
          <ol>
            {TRACK.map((t, j) => <li key={t} className={j === step.track ? 'now' : j < step.track ? 'past' : ''}>{t}</li>)}
          </ol>
        </div>
      </div>
      <div className="bench-side">
        <ol className="tabs" role="tablist" aria-label="Steps">
          {STEPS.map((st, i) => (
            <li key={st.n}>
              <button type="button" className="tab" role="tab" aria-selected={i === cur} onClick={() => setCur(i)}>
                <b>{st.n}</b><span>{st.title}</span><span className="bar"><i ref={(el) => { bars.current[i] = el; }} /></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="panel" role="tabpanel" aria-live="polite">
          <div className="label" style={{ color: 'var(--muted)' }}>Step {step.n} of {String(STEPS.length).padStart(2, '0')}</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <div className="gets"><span className="label">You get</span><span>{step.gets}</span></div>
        </div>
        {!still && (
          <button type="button" className="play" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
      </div>
    </div>
  );
}
