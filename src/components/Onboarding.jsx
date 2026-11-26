import { useState } from 'react';
import * as I from './Icons.jsx';
import AuthControls from './AuthControls.jsx';
import { useContent } from '../lib/content.jsx';

const DONE_KEY = 'wp.onboarded';

export function needsOnboarding() {
  try {
    if (new URLSearchParams(window.location.search).has('welcome')) return true;
    if (window.localStorage.getItem(DONE_KEY)) return false;
    return !window.localStorage.getItem('wp.prefs');
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    // The flow remains available on the next visit if storage is unavailable.
  }
}

const FEATURES = [
  { icon: <span className="ob-live-dot" />, text: 'Verified live scores when available' },
  { icon: <I.Calendar size={18} />, text: 'Nepal fixtures, at a glance' },
  { icon: <I.Spark size={18} />, text: 'Ask Cue about matches and results' },
];

export default function Onboarding({ prefs, onDone }) {
  const [step, setStep] = useState(0);
  const { followTopics, loadState } = useContent();
  const followedTopics = prefs.following.filter((id) => followTopics.some((topic) => topic.id === id)).length;
  const finish = () => {
    markDone();
    onDone();
  };
  const next = () => step < 3 ? setStep(step + 1) : finish();

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Welcome to willowPoint">
      <div className="ob-top">
        {step > 0 ? (
          <button type="button" className="ob-back" aria-label="Back" onClick={() => setStep(step - 1)}>
            <I.Chevron size={17} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : <img className="ob-logo" src="/logo-light.png" alt="willowPoint" />}
        <span className="ob-step-label">{String(step + 1).padStart(2, '0')} / 04</span>
      </div>

      <div className={`ob-body ob-step-${step}`} key={step}>
        {step === 0 && (
          <>
            <img className="ob-mark" src="/logo-light.png" alt="" />
            <h1 className="ob-title">Namaskar, <span>hajur.</span></h1>
            <p className="ob-sub">Nepal’s cricket in one place, in Nepal time.</p>
            <ul className="ob-features">
              {FEATURES.map((feature) => (
                <li key={feature.text}><span className="ob-glyph" aria-hidden="true">{feature.icon}</span>{feature.text}</li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="ob-title">Pick your <span>cricket.</span></h1>
            <p className="ob-sub">Follow the cricket you care about. Change your picks any time in You.</p>
            {followTopics.length ? <div className="ob-tiles">
              {followTopics.map((item) => {
                const on = prefs.following.includes(item.id);
                return (
                  <button key={item.id} type="button" className={`ob-tile${on ? ' on' : ''}`} aria-pressed={on} onClick={() => prefs.toggleFollow(item.id)}>
                    <span className="ob-tile-icon" aria-hidden="true" />
                    <span className="ob-tile-text"><strong>{item.name}</strong><small>{item.kind}</small></span>
                    <span className="ob-check" aria-hidden="true">{on && <I.Check size={14} sw={2.6} />}</span>
                  </button>
                );
              })}
            </div> : <p className="empty-state">{loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available. You can continue and follow them after the next verified refresh.'}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="ob-title">Keep it <span>with you.</span></h1>
            <p className="ob-sub">Sign in to link your follows and saved records to your account.</p>
            <AuthControls onSuccess={next} compact />
          </>
        )}

        {step === 3 && (
          <>
            <span className="ob-ready" aria-hidden="true"><I.Check size={28} sw={1.8} /></span>
            <h1 className="ob-title">You’re <span>all set.</span></h1>
            <p className="ob-sub">Your cricket, current and close. Scores appear only after independent verification.</p>
            <div className="ob-card">
              <div className="ob-row"><I.Check size={18} /><span className="ob-row-tx"><b>Following {followedTopics} current {followedTopics === 1 ? 'topic' : 'topics'}</b><span>Manage them any time in You</span></span></div>
              <div className="ob-row"><I.Globe size={18} /><span className="ob-row-tx"><b>Nepal time</b><span>Every listed fixture uses NPT</span></span></div>
            </div>
          </>
        )}
      </div>

      <div className="ob-foot">
        <div className="ob-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index === step ? 'on' : undefined} />)}
        </div>
        {step === 2 ? (
          <button type="button" className="ob-guest" onClick={finish}>Continue as guest</button>
        ) : (
          <button type="button" className="ob-cta" onClick={next} disabled={step === 1 && (loadState === 'loading' || (followTopics.length > 0 && followedTopics === 0))}>
            {step === 0 ? 'Get started' : step === 1 ? 'Continue' : 'Let’s go'}
            <I.ArrowUp size={17} sw={2.2} style={{ transform: 'rotate(90deg)' }} />
          </button>
        )}
        <span className="sr-only" aria-live="polite">Step {step + 1} of 4</span>
      </div>
    </div>
  );
}
