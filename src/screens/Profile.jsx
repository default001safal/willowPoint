import { useEffect, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { followables } from '../data.js';
import { Divider } from '../components/ui.jsx';
import { getSavedItems } from '../components/RecordLayers.jsx';
import { useContent } from '../lib/content.jsx';
import { watchUser } from '../lib/firebase.js';

// Account summary opens a focused account flow; sign-out is confirmed separately.
function AccountCard({ onOpen }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => watchUser(setUser), []);
  const authed = user && !user.isAnonymous;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row-text" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>{authed ? 'Signed in' : 'Your account'}</strong>
        <span style={{ fontSize: 13 }}>{authed ? user.email || 'Google account' : 'Playing as a local fan — follows and saves sync to this device.'}</span>
      </div>
      <button type="button" className="setting" onClick={onOpen}>{authed ? 'Manage account' : 'Continue with Google'}<I.Chevron size={15} /></button>
    </div>
  );
}

export default function ProfileScreen({ prefs, onOpenSaved, onOpenAccount }) {
  const { saved, following, toggleFollow: toggle, synced } = prefs;
  const content = useContent();
  const savedItems = getSavedItems(content, saved);

  return (
    <main>
      <header className="screen-head"><h1 className="screen-title">Profile</h1><p className="subhead">Your teams, saved matches and settings.</p></header>
      <section className="section"><AccountCard onOpen={onOpenAccount} /></section>

      <section className="section">
        <div className="card">
          <div className="profile-top">
            <span className="avatar">C</span>
            <div className="row-text"><strong style={{ fontSize: 17, fontWeight: 700 }}>Cricket fan</strong><span style={{ fontSize: 13 }}>Following {following.length}</span></div>
            <span className="muted" style={{ fontSize: 12 }}>{synced ? 'Synced here' : 'Saved here'}</span>
          </div>
          <button type="button" className="setting row-top" onClick={onOpenSaved}>
            <I.Bookmark size={20} style={{ color: 'var(--muted)' }} /><span style={{ flex: 1, fontWeight: 500 }}>Saved matches</span><span className="muted" style={{ fontSize: 14 }}>{savedItems.length}</span><I.Chevron size={16} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      </section>

      <Divider />
      <section className="section">
        <h2 className="group-label">Your cricket</h2>
        <div className="card">{followables.map((item) => {
          const on = following.includes(item.id);
          return <div key={item.id} className="list-row" style={{ paddingRight: 12 }}><div className="row-text"><strong>{item.name}</strong><span>{item.kind}</span></div><button type="button" className="follow" aria-pressed={on} onClick={() => toggle(item.id)}>{on ? 'Following' : 'Follow'}</button></div>;
        })}</div>
      </section>

      <Divider />
      <section className="section">
        <h2 className="group-label">Preferences</h2>
        <div className="card">
          <div className="setting"><span style={{ flex: 1 }}>Time zone</span><span className="muted" style={{ fontSize: 14 }}>Nepal (NPT)</span></div>
          <div className="setting"><span style={{ flex: 1 }}>Language</span><span className="muted" style={{ fontSize: 14 }}>English</span></div>
          <div className="setting" style={{ paddingTop: 12, paddingBottom: 12 }}><div className="row-text"><strong style={{ fontWeight: 400 }}>Match alerts</strong><span>Coming later</span></div></div>
          <div className="setting"><span style={{ flex: 1 }}>Sources</span><span className="muted" style={{ fontSize: 13 }}>Shown with available records</span></div>
        </div>
      </section>

      <Divider />
      <section className="section">
        <div className="card about"><img src="/logo-light.png" alt="willowPoint logo" /><span className="muted" style={{ fontSize: 14 }}>Our game. In focus.</span><div style={{ display: 'flex', gap: 18 }}><a href="/photo-credits.html" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, padding: '10px 0' }}>Photo credits</a><a href="/about.html" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, padding: '10px 0' }}>About</a></div></div>
        <p className="footnote" style={{ textAlign: 'center' }}>{synced ? 'Your preferences are synced to this browser session.' : 'Your preferences are saved on this device.'}</p>
      </section>
    </main>
  );
}
