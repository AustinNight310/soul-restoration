'use client';
// Staff sign-in, kept apart from the customer one. Workers and admins sign in with a password.
// New staff: an admin adds their email first, then they set up a login here and confirm it.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import PasswordField from '../../../components/PasswordField';
import s from './sign-in.module.css';

export default function StaffSignIn() {
  const { ready, user, isStaff, recovering, doneRecovering, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user && isStaff && !recovering) router.replace('/staff');
  }, [ready, user, isStaff, recovering, router]);

  let body;
  if (recovering && user) body = <NewPassword onDone={() => { doneRecovering(); router.replace('/staff'); }} />;
  else if (!ready || (user && isStaff)) body = <p className="muted">Loading…</p>;
  else if (user) body = <NotStaff email={user.email} onSignOut={async () => { await signOut(); router.replace('/staff/sign-in?out=1'); }} />;
  else body = <SignInForm />;

  return (
    <div className={s.page}>
      <div className={s.panel}>
        <div className={s.kicker}>The bench</div>
        <h1 className={s.title}>Staff only.</h1>
        <p className={s.lede}>Workers and admins sign in here. Customers sign in on the <Link href="/sign-in">main site</Link>.</p>
      </div>
      <div className={s.formSide}>{body}</div>
    </div>
  );
}

function SignInForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState('in'); // 'in' | 'setup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  function go(next) { setMode(next); setMsg(''); setNote(''); setPassword(''); setConfirm(''); }

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setNote('');
    if (mode === 'setup' && password !== confirm) return setMsg('The two passwords don’t match.');
    setBusy(true);
    const back = `${window.location.origin}/staff/sign-in`;
    let res;
    if (mode === 'in') res = await supabase.auth.signInWithPassword({ email, password });
    else if (mode === 'setup') res = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: back } });
    else res = await supabase.auth.resetPasswordForEmail(email, { redirectTo: back });
    setBusy(false);
    if (res.error) {
      return setMsg(res.error.message === 'Invalid login credentials'
        ? 'That email and password don’t match. Try again, or use “Forgot password?”.'
        : res.error.message);
    }
    if (mode === 'setup' && !res.data.session) setNote('Almost done. Check your email to confirm it, then sign in here.');
    if (mode === 'forgot') setNote('If that email has a login, a reset link is on its way. Open it on this device.');
  }

  const title = mode === 'in' ? 'Sign in to the bench.' : mode === 'setup' ? 'Set up your login.' : 'Reset your password.';
  return (
    <form onSubmit={submit} className={s.form}>
      {params.get('out') && mode === 'in' && <p className="notice" role="status">You're signed out.</p>}
      <div className="eyebrow">Staff sign-in</div>
      <h2 style={{ fontSize: 32 }}>{title}</h2>
      {mode === 'setup' && (
        <p className="muted small" style={{ margin: 0 }}>
          Use the email an admin added to the team. Signed in here before with an email link?
          Use <button type="button" className="linkbtn" style={{ color: 'var(--accent)' }} onClick={() => go('forgot')}>Forgot password</button> to set one instead.
        </p>
      )}
      <label className="field">Email<input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      {mode !== 'forgot' && (
        <PasswordField label={mode === 'setup' ? 'Password (8+ characters)' : 'Password'} value={password} onChange={setPassword}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'} show={show} setShow={setShow} />
      )}
      {mode === 'setup' && (
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" show={show} setShow={setShow} />
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
      {note && <p className="muted" role="status" style={{ margin: 0 }}>{note}</p>}
      <button className="btn dark block" disabled={busy}>
        {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : mode === 'setup' ? 'Set up login' : 'Email me a reset link'}
      </button>
      {mode === 'in' && <button type="button" className="btn ghost block" onClick={() => go('forgot')}>Forgot password?</button>}
      {mode === 'in'
        ? <p className="small muted" style={{ margin: 0 }}>New to the team? Once an admin has added your email, <button type="button" className="linkbtn" style={{ color: 'var(--accent)' }} onClick={() => go('setup')}>set up your login</button>.</p>
        : <button type="button" className="btn ghost block" onClick={() => go('in')}>Back to sign in</button>}
    </form>
  );
}

function NotStaff({ email, onSignOut }) {
  return (
    <div className={s.form}>
      <h2 style={{ fontSize: 30 }}>Almost there.</h2>
      <p style={{ margin: 0 }}>You're signed in as <strong>{email}</strong>, but this account isn't on the team yet. Ask an admin to add this email, then refresh.</p>
      <Link href="/account" className="btn ghost block">Go to my account</Link>
      <button className="btn ghost block" onClick={onSignOut}>Sign out</button>
    </div>
  );
}

function NewPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (password !== confirm) return setMsg('The two passwords don’t match.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg(error.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className={s.form}>
      <div className="eyebrow">Staff sign-in</div>
      <h2 style={{ fontSize: 32 }}>Pick a new password.</h2>
      <PasswordField label="New password (8+ characters)" value={password} onChange={setPassword} autoComplete="new-password" show={show} setShow={setShow} />
      <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" show={show} setShow={setShow} />
      {msg && <p className="error" role="alert">{msg}</p>}
      <button className="btn dark block" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
    </form>
  );
}
