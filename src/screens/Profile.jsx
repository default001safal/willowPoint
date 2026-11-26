import { useEffect, useState } from 'react';
import * as I from '../components/Icons.jsx';
import { getSavedItems } from '../components/RecordLayers.jsx';
import { ScreenMasthead, SectionHead } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { watchUser } from '../lib/firebase.js';

export default function ProfileScreen({ prefs, onOpenSaved, onOpenAccount, onOpenRecord }) {
  const { saved, following, toggleFollow, synced } = prefs;
  const content = useContent();
  const savedItems = getSavedItems(content, saved);
  const followTopics = content.followTopics;
  const followedTopics = following.filter((id) => followTopics.some((topic) => topic.id === id)).length;
  const [user, setUser] = useState(undefined);
  useEffect(() => watchUser(setUser), []);
  const authed = user && !user.isAnonymous;

  return (
    <main className="screen profile-screen">
      <ScreenMasthead label="you" />
      <section className="idcard">
        <span className="profile-avatar"><I.User size={24} /></span>
        <div><h1>Cricket fan</h1><p>{authed ? user.email || 'Signed-in account' : `Following ${followedTopics} current ${followedTopics === 1 ? 'topic' : 'topics'} · this device`}</p></div>
        <button type="button" className="auth-btn" onClick={onOpenAccount}>{authed ? 'Manage' : 'Continue'}</button>
      </section>

      <section>
        <SectionHead title="Saved records">
          <button type="button" className="seclink" onClick={onOpenSaved}>{savedItems.length ? `${savedItems.length} saved →` : 'Open →'}</button>
        </SectionHead>
        {savedItems.length ? <div className="saved-list">{savedItems.slice(0, 3).map((item) => (
          <div className="saved-row" key={item.id}>
            {item.missing ? <span className="saved-main"><span className="sm"><b>{item.title}</b><span>{item.meta}</span></span></span> : <button type="button" className="saved-main" onClick={() => onOpenRecord(item.layer)}><span className="sm"><b>{item.title}</b><span>{item.meta}</span></span></button>}
            <button type="button" className="rm" aria-label={`Remove ${item.title}`} onClick={() => prefs.toggleSaved(item.id)}>Remove</button>
          </div>
        ))}</div> : <button type="button" className="empty-saved" onClick={onOpenSaved}><I.Bookmark size={18} /><span><b>No saved records yet</b><small>Save a fixture, result, or event to find it here.</small></span><I.Chevron size={15} /></button>}
      </section>

      <section>
        <SectionHead title="Your teams" className="between" />
        {followTopics.length ? <div className="teams">{followTopics.map((item) => {
          const on = following.includes(item.id);
          return <button key={item.id} type="button" className={`team-pill${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleFollow(item.id)}><span className="ind" />{item.name}</button>;
        })}</div> : <p className="empty-state compact">{content.loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available to follow yet.'}</p>}
        {followTopics.length > 0 && <p className="followcount">{followedTopics} of {followTopics.length} followed</p>}
      </section>

      <section>
        <SectionHead title="Settings" className="between" />
        <div className="setrow"><span className="sl">Time zone</span><span className="sr">Nepal (NPT)</span></div>
        <div className="setrow"><span className="sl">Language</span><span className="sr">English</span></div>
        <div className="setrow"><span className="sl">Preferences</span><span className="sr">{synced ? 'Synced' : 'Saved on this device'}</span></div>
        <a className="setrow setlink" href="/about.html" target="_blank" rel="noreferrer"><span className="sl">About willowPoint</span><I.Chevron size={14} /></a>
      </section>

      <footer className="prof-foot"><img src="/logo-light.png" alt="willowPoint" /><span>Your cricket, closer.</span><small>made for nepali fans</small></footer>
    </main>
  );
}
