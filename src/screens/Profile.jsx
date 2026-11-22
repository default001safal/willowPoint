import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import { followables } from '../data.js';
import { firebaseEnabled } from '../lib/firebase.js';
import { Divider, SaveButton, parts, relativeDay } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { MarkPair } from '../components/TeamMark.jsx';

// Resolve saved ids (fixtures and the NPL final) into rows; unknown ids are skipped.
function useSavedItems(saved) {
  const { today, fixtures, nplFinal } = useContent();
  return saved.map((id) => {
    if (id === 'npl-final' && nplFinal) {
      return { id, title: `${nplFinal.home} v ${nplFinal.away}`, meta: `NPL final · ${relativeDay(nplFinal.date, today)} · ${nplFinal.venue}` };
    }
    const f = fixtures.find((x) => x.id === id);
    if (!f) return null;
    const p = parts(f.date);
    return { id, title: f.title, meta: `${p.date} ${p.month} · ${f.time} · ${f.venue}` };
  }).filter(Boolean);
}

export default function ProfileScreen({ prefs }) {
  const { saved, following, alerts, toggleFollow: toggle, setAlerts: setAlertsTo, toggleSaved, synced } = prefs;
  const setAlerts = (fn) => setAlertsTo(fn(alerts));
  const [showSaved, setShowSaved] = useState(false);
  const savedItems = useSavedItems(saved);

  return (
    <main>
      <header className="screen-head">
        <h1 className="screen-title">Profile</h1>
        <p className="subhead">Your teams, alerts and settings.</p>
      </header>

      <section className="section">
        <div className="card">
          <div className="profile-top">
            <span className="avatar">C</span>
            <div className="row-text">
              <strong style={{ fontSize: 17, fontWeight: 700 }}>Cricket fan</strong>
              <span style={{ fontSize: 13 }}>Following {following.length}</span>
            </div>
            <button type="button" className="ghost-btn">Edit</button>
          </div>
          <button type="button" className="setting row-top" aria-expanded={showSaved} onClick={() => setShowSaved((s) => !s)}>
            <I.Bookmark size={20} style={{ color: 'var(--muted)' }} />
            <span style={{ flex: 1, fontWeight: 500 }}>Saved matches</span>
            <span className="muted" style={{ fontSize: 14 }}>{savedItems.length}</span>
            <I.Chevron size={16} style={{ color: 'var(--muted)', transform: showSaved ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showSaved && (savedItems.length ? savedItems.map((s) => (
            <div key={s.id} className="list-row row-top saved-row">
              <div className="row-text">
                <strong className="with-marks"><MarkPair title={s.title} size={13} />{s.title}</strong>
                <span>{s.meta}</span>
              </div>
              <SaveButton label={s.title} saved onToggle={() => toggleSaved(s.id)} />
            </div>
          )) : (
            <p className="saved-empty row-top">Tap <I.Bookmark size={13} /> on any match to keep it here.</p>
          ))}
        </div>
      </section>

      <Divider />
      <section className="section">
        <h2 className="group-label">Your cricket</h2>
        <div className="card">
          {followables.map((f, i) => {
            const on = following.includes(f.id);
            return (
              <div key={f.id} className={`list-row${i ? '' : ''}`} style={{ paddingRight: 12 }}>
                <div className="row-text"><strong>{f.name}</strong><span>{f.kind}</span></div>
                <button type="button" className="follow" aria-pressed={on} onClick={() => toggle(f.id)}>
                  {on ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <Divider />
      <section className="section">
        <h2 className="group-label">Preferences</h2>
        <div className="card">
          <button type="button" className="setting">
            <span style={{ flex: 1 }}>Time zone</span>
            <span className="muted" style={{ fontSize: 14 }}>Nepal (NPT)</span>
            <I.Chevron size={16} style={{ color: 'var(--muted)' }} />
          </button>
          <button type="button" className="setting">
            <span style={{ flex: 1 }}>Language</span>
            <span className="muted" style={{ fontSize: 14 }}>English</span>
            <I.Chevron size={16} style={{ color: 'var(--muted)' }} />
          </button>
          <div className="setting" style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="row-text">
              <strong style={{ fontWeight: 400 }}>Match alerts</strong>
              <span>For matches you save</span>
            </div>
            <button type="button" role="switch" className="switch" aria-checked={alerts} aria-label="Match alerts" onClick={() => setAlerts((a) => !a)}>
              <span />
            </button>
          </div>
          <button type="button" className="setting">
            <span style={{ flex: 1 }}>Sources</span>
            <span className="muted" style={{ fontSize: 13 }}>Checked 10:03 NPT</span>
            <I.Chevron size={16} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      </section>

      <Divider />
      <section className="section">
        <div className="card about">
          <img src="/logo-light.png" alt="willowPoint logo" />
          <span className="muted" style={{ fontSize: 14 }}>Our game. In focus.</span>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="#" style={{ fontSize: 13, fontWeight: 600, padding: '10px 0' }}>Photo credits</a>
            <a href="#" style={{ fontSize: 13, fontWeight: 600, padding: '10px 0' }}>About</a>
          </div>
        </div>
        <p className="footnote" style={{ textAlign: 'center' }}>
          {firebaseEnabled && synced ? 'Your preferences sync to your account.' : 'Your preferences are saved on this device.'}
        </p>
      </section>
    </main>
  );
}
