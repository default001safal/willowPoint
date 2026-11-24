// First-run welcome: three short steps, shown once per device.
// Everything chosen here goes through the same prefs as Profile, so it syncs and can be changed later.
import { useState } from 'react';
import * as I from './Icons.jsx';
import { TeamMark } from './TeamMark.jsx';
import { followables } from '../data.js';

const DONE_KEY = 'wp.onboarded';

// Show on a fresh device, or on demand with ?welcome (handy for reviews).
export function needsOnboarding() {
  try {
    if (new URLSearchParams(window.location.search).has('welcome')) return true;
    if (window.localStorage.getItem(DONE_KEY)) return false;
    // Fans who already used the app have prefs on the device; don't interrupt them.
    return !window.localStorage.getItem('wp.prefs');
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* storage unavailable — it just shows again next time */
  }
}

const TILE_ICONS = {
  nepal: <TeamMark name="Nepal" size={22} />,
  npl: <I.Trophy size={20} />,
  women: <span className="ob-pair"><TeamMark name="Nepal" size={18} /><I.Female size={15} /></span>,
  u19: <I.CricketBat size={20} />,
  world: <I.Globe size={20} />,
};

const FEATURES = [
  { icon: <span className="ob-live-dot" />, text: 'Verified live scores when available' },
  { icon: <I.Calendar size={19} style={{ color: 'var(--muted)' }} />, text: 'Nepal fixtures, at a glance' },
  { icon: <I.Spark size={19} style={{ color: 'var(--accent)' }} />, text: 'Ask Cue about matches and results' },
];

export default function Onboarding({ prefs, onDone }) {
  const [step, setStep] = useState(0);
  const finish = () => {
    markDone();
    onDone();
  };
  const next = () => (step < 2 ? setStep(step + 1) : finish());

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Welcome to willowPoint">
      <div className="ob-top">
        {step > 0 ? (
          <button type="button" className="ob-icon-btn" aria-label="Back" onClick={() => setStep(step - 1)}>
            <I.Chevron size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : <span />}
        <button type="button" className="ob-skip" onClick={finish}>Skip</button>
      </div>

      <div className="ob-body" key={step}>
        {step === 0 && (
          <>
            <img className="ob-mark" src="/logo-light.png" alt="willowPoint" />
            <h1 className="ob-title">Namaskar, <span>hajur!</span></h1>
            <p className="ob-sub">Nepal's cricket in one place, in Nepal time.</p>
            <ul className="ob-features">
              {FEATURES.map((f) => (
                <li key={f.text}><span className="ob-glyph" aria-hidden="true">{f.icon}</span>{f.text}</li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="ob-title">Pick your <span>cricket</span></h1>
            <p className="ob-sub">Follow the cricket you care about. Change your picks any time in Profile.</p>
            <div className="ob-tiles">
              {followables.map((f) => {
                const on = prefs.following.includes(f.id);
                return (
                  <button key={f.id} type="button" className="ob-tile" aria-pressed={on} onClick={() => prefs.toggleFollow(f.id)}>
                    <span className="ob-tile-icon" aria-hidden="true">{TILE_ICONS[f.id]}</span>
                    <span className="ob-tile-text"><strong>{f.name}</strong><small>{f.kind}</small></span>
                    <span className="ob-check" aria-hidden="true">{on && <I.Check size={14} sw={2.6} />}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="ob-title">You're <span>all set</span></h1>
            <p className="ob-sub">Your picks shape what you follow. Change them any time in Profile.</p>
            <div className="card ob-settings">
              <div className="setting">
                <I.Check size={19} style={{ color: 'var(--accent)' }} />
                <span className="row-text" style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>Following {prefs.following.length} topics</strong>
                  <span>See them in Discover and Profile</span>
                </span>
              </div>
              <div className="setting">
                <I.Globe size={19} style={{ color: 'var(--muted)' }} />
                <span className="row-text" style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>Time zone</strong>
                  <span>All match times shown in</span>
                </span>
                <span className="muted" style={{ fontSize: 14 }}>Nepal (NPT)</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ob-foot">
        <div className="ob-dots" aria-hidden="true">
          {[0, 1, 2].map((i) => <span key={i} className={i === step ? 'on' : undefined} />)}
        </div>
        <button type="button" className="ob-cta" onClick={next} disabled={step === 1 && prefs.following.length === 0}>
          {step === 0 ? 'Get started' : step === 1 ? 'Continue' : "Let's go"}
          <I.ArrowUp size={18} sw={2.2} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <span className="sr-only" aria-live="polite">Step {step + 1} of 3</span>
      </div>
    </div>
  );
}
