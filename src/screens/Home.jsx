import { useState } from 'react';
import * as I from '../components/Icons.jsx';
import LiveSection from '../components/LiveCard.jsx';
import { Divider, SaveButton, SectionHead, addDays, parts, relativeDay } from '../components/ui.jsx';
import { TODAY, fixtures, liveMatches, nplFinal, stories, worldNews } from '../data.js';

function Fixtures({ saved, toggleSaved, onSeeAll }) {
  const [day, setDay] = useState('all');
  const week = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i + 1));
  const hasMatch = new Set(fixtures.map((f) => f.date));
  const shown = day === 'all' ? fixtures : fixtures.filter((f) => f.date === day);

  return (
    <section className="section">
      <SectionHead title="Nepal's next matches">
        <button type="button" className="section-link" onClick={onSeeAll}>See all</button>
      </SectionHead>
      <div className="card">
        <div className="strip">
          <button type="button" aria-pressed={day === 'all'} aria-label="All dates" onClick={() => setDay('all')}>
            <I.Calendar size={16} />
            <small style={{ fontWeight: 600 }}>All</small>
          </button>
          {week.map((d) => {
            const p = parts(d);
            return (
              <button key={d} type="button" aria-pressed={day === d} aria-label={`${p.day} ${p.date} ${p.month}`} onClick={() => setDay(d)}>
                <small>{p.day}</small>
                <b>{p.date}</b>
                <span className={`dot${hasMatch.has(d) ? ' on' : ''}`} />
              </button>
            );
          })}
        </div>
        {shown.length === 0 && <p className="empty">No Nepal matches on this day.</p>}
        {shown.map((f) => {
          const p = parts(f.date);
          return (
            <div className="list-row" key={f.id}>
              <div className="date-block"><b>{p.date}</b><small>{p.month}</small></div>
              <div className="row-text">
                <strong>{f.title}</strong>
                <span>{relativeDay(f.date, TODAY)} · {f.time} · {f.venue}</span>
              </div>
              <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NplFinal({ onPreview }) {
  const [remind, setRemind] = useState(false);
  return (
    <section className="section">
      <SectionHead title="NPL final">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="round-btn" aria-label={remind ? 'Reminder set' : 'Remind me'} aria-pressed={remind} onClick={() => setRemind((r) => !r)}>
            <I.Bell size={15} sw={2} />
          </button>
          <button type="button" className="round-btn" aria-label="Preview with Cue" onClick={onPreview}>
            <I.Spark size={15} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      </SectionHead>
      <article className="card final-card">
        <div className="versus">
          <span className="name">{nplFinal.home}</span>
          <span className="vs">VS</span>
          <span className="name">{nplFinal.away}</span>
        </div>
        <div className="chips">
          <span className="chip"><span className="today" />{relativeDay(nplFinal.date, TODAY)} {nplFinal.time}</span>
          <span className="chip"><I.Pin size={13} />{nplFinal.venue}</span>
          <span className="chip accent"><I.Swap size={13} />{nplFinal.note}</span>
        </div>
      </article>
    </section>
  );
}

export default function HomeScreen({ saved, toggleSaved, go, askCue }) {
  return (
    <main>
      <header className="topbar">
        <img src="/logo-light.png" alt="willowPoint" />
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Notifications">
            <I.Bell size={22} />
            <span className="notif-dot" />
          </button>
          <button type="button" className="icon-btn" aria-label="Open profile" onClick={() => go('profile')}>
            <I.User size={22} />
          </button>
        </div>
      </header>

      <section className="greeting">
        <h1>Namaskar, hajur!</h1>
        <label className="search">
          <I.Search size={18} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search Nepal cricket" />
        </label>
        <div className="pill-row">
          <button type="button" className="pill" onClick={() => askCue('Give me my quick Nepal briefing')}>
            <I.Spark size={14} style={{ color: 'var(--accent)' }} />Quick brief
          </button>
          <button type="button" className="pill" onClick={() => go('discover')}>
            <I.Calendar size={14} style={{ color: 'var(--muted)' }} />Nepal next
          </button>
          <button type="button" className="pill" onClick={() => go('discover', 'NPL')}>
            <I.Trophy size={14} style={{ color: 'var(--muted)' }} />NPL
          </button>
          <button type="button" className="pill" onClick={() => go('profile')}>
            <I.Bookmark size={14} style={{ color: 'var(--muted)' }} />Saved
          </button>
        </div>
      </section>

      <LiveSection matches={liveMatches} onAskCue={askCue} />

      <Divider />
      <Fixtures saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} />

      <Divider />
      <NplFinal onPreview={() => askCue('Set the scene for the NPL final')} />

      <Divider />
      <section className="section" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div style={{ padding: '0 16px' }}>
          <SectionHead title="News">
            <button type="button" className="section-link">More</button>
          </SectionHead>
        </div>
        <div style={{ padding: '0 16px' }}>
          <button type="button" className="ribbon simple" onClick={() => askCue('Give me my quick Nepal briefing')}>
            <span className="lead"><I.Spark size={15} /></span>
            <span className="grow">Cue's quick read. Your Nepal briefing.</span>
            <span className="chev"><I.Chevron size={14} /></span>
          </button>
        </div>
        <div className="carousel">
          {stories.map((s) => (
            <a key={s.id} href="#" className="card story">
              <div className="photo">Photo · {s.credit}</div>
              <div className="body">
                <strong>{s.title}</strong>
                <span>{s.source}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <Divider />
      <section className="section">
        <SectionHead title="Around the world">
          <button type="button" className="section-link">More</button>
        </SectionHead>
        <div className="card">
          {worldNews.map((n) => (
            <a key={n.id} href="#" className="news-item">
              <strong>{n.title}</strong>
              <p>{n.blurb}</p>
              <small>{n.source} · {n.date}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
