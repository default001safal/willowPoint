import { useId, useState } from 'react';
import * as I from './Icons.jsx';
import {
  authErrorMessage,
  createAccountWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from '../lib/firebase.js';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.1L6.5 14Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5L18.7 4.6A10 10 0 0 0 3.2 7.5L6.5 10A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  );
}

export default function AuthControls({ onSuccess, compact = false }) {
  const id = useId();
  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onSuccess?.();
    } catch (exception) {
      setError(authErrorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    run(() => mode === 'signin' ? signInWithEmail(email, password) : createAccountWithEmail(email, password));
  };

  return (
    <div className={`auth-controls${compact ? ' compact' : ''}`}>
      <button type="button" className="auth-google" disabled={busy} onClick={() => run(signInWithGoogle)}>
        <GoogleMark />Continue with Google
      </button>
      <div className="auth-or">or</div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={emailId}>Email address</label>
        <input
          id={emailId}
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label className="sr-only" htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          className="auth-input"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="auth-email-submit" disabled={busy || !email.trim() || password.length < 6}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
          {!busy && <I.ArrowUp size={16} style={{ transform: 'rotate(90deg)' }} />}
        </button>
      </form>
      <button
        type="button"
        className="auth-mode"
        disabled={busy}
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
