import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import AuthControls from './AuthControls.jsx';
import CueMark from './CueMark.jsx';
import { useContent } from '../lib/content.jsx';
import { watchUser } from '../lib/firebase.js';

const DONE_KEY = 'wp.onboarded';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const roman = (index) => ROMAN[index] || String(index + 1);

const FEATURES = [
  'Live scores, double-verified',
  'Every fixture, in Nepal time',
  'Ask Cue — matches and fixtures',
];

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

function todayStamp() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function Onboarding({ prefs, onDone }) {
  const [step, setStep] = useState(0);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [user, setUser] = useState(null);
  const { followTopics, loadState } = useContent();
  const customFollows = prefs.customFollows || [];
  const followedTopics = prefs.following.filter((id) => followTopics.some((topic) => topic.id === id)).length;
  const followCount = followedTopics + customFollows.length;

  useEffect(() => watchUser(setUser), []);

  const finish = () => {
    markDone();
    onDone();
  };
  const commitOther = () => {
    const value = otherText.trim().slice(0, 40);
    if (!value) return;
    prefs.addCustomFollow(value);
    setOtherText('');
  };
  const next = () => {
    if (step === 1) commitOther();
    if (step < 3) setStep(step + 1);
    else finish();
  };
  const tileCount = followTopics.length + customFollows.length;

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Welcome to willowPoint">
      <div className="ob-top">
        <span className="ob-topleft">
          {step === 0 ? <span className="ob-date">{todayStamp()}</span> : <img className="ob-logo" src="/logo-light.png" alt="willowPoint" />}
        </span>
        {step > 0 && (
          <button type="button" className="ob-back" aria-label="Back" onClick={() => setStep(step - 1)}>←</button>
        )}
      </div>

      <div className={`ob-body ob-step-${step}`} key={step}>
        {step === 0 && (
          <>
            <img className="ob-mark" src="/logo-light.png" alt="willowPoint" />
            <h1 className="ob-title">Namaskar<span className="ob-dot">.</span></h1>
            <p className="ob-sub">Welcome to willowPoint</p>
            <ul className="ob-features">
              {FEATURES.map((text, index) => (
                <li key={text}><span className="ob-num">{roman(index)}</span>{text}</li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="ob-title">Pick your <span>cricket</span></h1>
            <p className="ob-sub">Follow the cricket you care about.</p>
            {followTopics.length || customFollows.length ? (
              <div className="ob-tiles">
                {followTopics.map((item, index) => {
                  const on = prefs.following.includes(item.id);
                  return (
                    <button key={item.id} type="button" className={`ob-tile${on ? ' on' : ''}`} aria-pressed={on} onClick={() => prefs.toggleFollow(item.id)}>
                      <span className="ob-numl">{roman(index)}</span>
                      <span className="ob-tile-text"><strong>{item.name}</strong>{item.kind ? <small>{item.kind}</small> : null}</span>
                      <span className="ob-check" aria-hidden="true">{on && <I.Check size={13} sw={2.4} />}</span>
                    </button>
                  );
                })}
                {customFollows.map((name, index) => (
                  <button key={name} type="button" className="ob-tile on" aria-pressed="true" title="Tap to remove" onClick={() => prefs.removeCustomFollow(name)}>
                    <span className="ob-numl">{roman(followTopics.length + index)}</span>
                    <span className="ob-tile-text"><strong>{name}</strong><small>your pick</small></span>
                    <span className="ob-check" aria-hidden="true"><I.Check size={13} sw={2.4} /></span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`ob-tile ob-other${otherText.trim() ? ' on' : ''}`}
                  aria-pressed={!!otherText.trim()}
                  onClick={() => setOtherOpen(!otherOpen)}
                >
                  <span className="ob-numl">{roman(tileCount)}</span>
                  <span className="ob-tile-text"><strong>Other</strong><small>anything else — cue sorts it</small></span>
                  <span className="ob-check" aria-hidden="true">{otherText.trim() ? <I.Check size={13} sw={2.4} /> : null}</span>
                </button>
                {otherOpen && (
                  <input
                    className="ob-other-input"
                    type="text"
                    value={otherText}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="e.g. India · The Hundred · BPL"
                    onChange={(event) => setOtherText(event.target.value)}
                  />
                )}
              </div>
            ) : (
              <p className="empty-state">{loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available. You can continue and follow them after the next verified refresh.'}</p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="ob-title">Sign <span>in</span></h1>
            <p className="ob-sub">Sync your follows, saved matches and Cue chats across devices.</p>
            <AuthControls onSuccess={() => setStep(3)} compact />
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="ob-title">You’re <span>all set</span></h1>
            <p className="ob-sub">Your picks shape what you follow. Change them any time in Profile.</p>
            <div className="ob-card">
              {user && !user.isAnonymous && (
                <div className="ob-row"><I.User size={17} /><span className="ob-row-tx"><b>{user.email || 'Signed in'}</b><span>follows sync across devices</span></span></div>
              )}
              <div className="ob-row"><I.Check size={17} /><span className="ob-row-tx"><b>Following {followCount} {followCount === 1 ? 'topic' : 'topics'}</b><span>See them in Discover and Profile</span></span></div>
              <div className="ob-row"><I.Globe size={17} /><span className="ob-row-tx"><b>Time zone</b><span>All match times shown in</span></span><span className="ob-val">Nepal (NPT)</span></div>
              {customFollows.map((name) => (
                <div className="ob-row" key={name}><CueMark size={17} /><span className="ob-row-tx"><b>Cue logged “{name}” as a follow</b><span>parsed from your input</span></span></div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ob-foot">
        <div className="ob-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index === step ? 'on' : undefined} />)}
        </div>
        {step === 2 ? (
          <button type="button" className="ob-guest" onClick={() => setStep(3)}>Continue as guest</button>
        ) : (
          <button type="button" className="ob-cta" onClick={next} disabled={step === 1 && (loadState === 'loading' || (followTopics.length > 0 && followCount === 0))}>
            {step === 0 ? 'Get started' : step === 1 ? 'Continue' : 'Let’s go'}
            <I.ArrowUp size={15} sw={2} style={{ transform: 'rotate(90deg)' }} />
          </button>
        )}
        <span className="sr-only" aria-live="polite">Step {step + 1} of 4</span>
      </div>
    </div>
  );
}
