'use client';
// Password field with a Show/Hide button so typos are easy to catch.
export default function PasswordField({ label, value, onChange, autoComplete, show, setShow }) {
  return (
    <label className="field">{label}
      <span style={{ position: 'relative', display: 'block' }}>
        <input className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} minLength={8}
          value={value} onChange={(e) => onChange(e.target.value)} required style={{ width: '100%', paddingRight: 64 }} />
        <button type="button" onClick={() => setShow(!show)} className="small"
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, minHeight: 40 }}>
          {show ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  );
}
