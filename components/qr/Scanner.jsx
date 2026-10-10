'use client';
// Scan a station poster or a pair ticket with the phone's camera, without leaving the app.
// Works in any browser with a camera (jsQR reads the frames). Typing the ticket code always works too.
// onCode(text) returns true when it used the code; otherwise scanning carries on and `message` says why.
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function Scanner({ onCode, onClose, title = 'Scan a QR code', message }) {
  const video = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | live | blocked
  const [typed, setTyped] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let stream;
    let timer;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    function tick() {
      const v = video.current;
      if (done.current) return;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (hit?.data) {
          done.current = true;
          Promise.resolve(onCode(hit.data)).then((used) => {
            if (used) { navigator.vibrate?.(60); return; }
            done.current = false;
            timer = setTimeout(tick, 1500); // give them a moment to point at the right code
          });
          return;
        }
      }
      timer = setTimeout(tick, 150);
    }
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        video.current.play().catch(() => {});
        setStatus('live');
        tick();
      })
      .catch(() => setStatus('blocked'));
    if (!navigator.mediaDevices) setStatus('blocked');
    return () => { done.current = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="scan-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scan-box">
        <div className="scan-head">
          <strong>{title}</strong>
          <button type="button" className="btn ghost small" onClick={onClose}>Close</button>
        </div>
        <div className="scan-view">
          <video ref={video} playsInline muted />
          {status === 'live' && <div className="scan-frame" aria-hidden="true" />}
          {status !== 'live' && (
            <p className="scan-note">{status === 'starting' ? 'Opening the camera…' : 'The camera isn’t available. Allow camera access for this site, or type the code on the ticket below.'}</p>
          )}
        </div>
        {message && <p className="error" role="alert" style={{ margin: 0 }}>{message}</p>}
        <form className="scan-type" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onCode(typed.trim()); }}>
          <label className="field" style={{ flex: 1 }}>Or type the ticket code
            <input className="input" inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Order and pair, e.g. 1042-2" />
          </label>
          <button className="btn dark" type="submit" disabled={!typed.trim()}>Go</button>
        </form>
      </div>
    </div>
  );
}
