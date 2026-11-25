import { useState } from 'react';
import * as I from './Icons.jsx';
import { Divider, SectionHead, parts } from './ui.jsx';
import { TeamMark } from './TeamMark.jsx';
import { followables } from '../data.js';
import { useContent } from '../lib/content.jsx';
import { kickoffUTC } from '../lib/statcard.js';

// Locally served, credited Commons images avoid a third-party request for each poster.
const PHOTOS = {
  hero: '/photos/hero-kirtipur.jpg',
  npl: '/photos/npl-kirtipur.jpg',
  league: '/photos/league-kirtipur.jpg',
  women: '/photos/women-kirtipur.jpg',
  youth: '/photos/youth-kirtipur.jpg',
  mulpani: '/photos/mulpani.jpg',
  pokhara: '/photos/pokhara.jpg',
};

const COMPETITIONS = [
  { id: 'qualifier', title: 'Qualifier Play-off', caption: 'Eight teams, December', tag: 'Dec 4', photo: PHOTOS.hero, filter: 'Nepal' },
  { id: 'npl', title: 'Nepal Premier League', caption: 'Eight cities, one trophy', tag: 'Champions', photo: PHOTOS.npl, filter: 'NPL' },
  { id: 'league', title: 'World Cup League 2', caption: "Nepal's ODI league", tag: 'ODI', photo: PHOTOS.league, filter: 'League 2' },
  { id: 'women', title: 'Nepal Women', caption: 'The national side', tag: 'Women', photo: PHOTOS.women, filter: 'Nepal Women', topic: 'women' },
  { id: 'u19', title: 'Nepal U19', caption: 'The next ones through', tag: 'Youth', photo: PHOTOS.youth, filter: 'Nepal U19', topic: 'u19' },
];

const GROUNDS = [
  { id: 'kirtipur', title: 'TU Kirtipur', caption: "Nepal's home ground", tag: 'Kathmandu', photo: PHOTOS.hero, query: 'Kirtipur' },
  { id: 'mulpani', title: 'Upper Mulpani', caption: 'Second international ground', tag: 'Kathmandu', photo: PHOTOS.mulpani, query: 'Mulpani' },
  { id: 'pokhara', title: 'Pokhara Rangasala', caption: "Women's internationals", tag: 'Pokhara', photo: PHOTOS.pokhara, query: 'Pokhara' },
];

function Frame({ src, className = '', children }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`frame ${className}`}>
      {src && !failed && <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      <span className="frame-scrim" />
      {children}
    </span>
  );
}

function Poster({ item, onOpen, pressed }) {
  return (
    <button type="button" className="poster" aria-pressed={pressed} onClick={() => onOpen(item)}>
      <Frame src={item.photo}>
        <span className="poster-tag">{item.tag}</span>
        <span className="poster-copy"><strong>{item.title}</strong><span>{item.caption}</span></span>
      </Frame>
    </button>
  );
}

function BrowseRow({ title, children }) {
  return (
    <>
      <Divider />
      <section className="section prow" aria-label={title}>
        <SectionHead title={title} />
        <div className="carousel" tabIndex={0} role="group" aria-label={`${title}, scroll for more`}>{children}</div>
      </section>
    </>
  );
}

export default function DiscoverBrowse({ saved, toggleSaved, following, toggleFollow, onOpenSchedule }) {
  const { today, stories, fixtures, results, liveMatches, nplFinal, featuredEvent } = useContent();
  const now = Date.now();
  const upcoming = fixtures.filter((f) => f.date >= today && (kickoffUTC(f.date, f.time) ?? Infinity) > now).sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));
  const next = upcoming[0];
  const finalResult = nplFinal?.result && nplFinal.date <= today ? { date: nplFinal.date, lines: nplFinal.result.lines, summary: nplFinal.result.summary } : null;
  const recent = [...results, ...(finalResult ? [finalResult] : [])].filter((r) => r.date && r.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  const event = featuredEvent && today <= featuredEvent.end ? featuredEvent : null;
  const eventId = featuredEvent?.id || 'cwc-qp-2026';
  const eventSaved = saved.includes(eventId);
  const hasMatches = (filter) => [...fixtures, ...results, ...liveMatches].some((m) => m.competition === filter);
  const competitions = COMPETITIONS.filter((item) => item.id !== 'league' || hasMatches(item.filter));
  const openCompetition = (item) => {
    if (item.topic && !hasMatches(item.filter)) toggleFollow(item.topic);
    else onOpenSchedule({ filter: item.id === 'qualifier' ? 'Nepal' : item.filter });
  };
  return (
    <>
      <section className="section hero-section">
        <article className="hero">
          <Frame src={PHOTOS.hero} className="hero-frame">
            <span className="hero-copy">
              <span className="hero-kicker">{event ? `${parts(event.start).date}–${parts(event.end).date} ${parts(event.end).month} · ${event.venue}` : 'Nepal cricket · In focus'}</span>
              <h2>{event ? event.short || event.title : next ? 'The next match awaits' : 'Explore the game'}</h2>
              <p>{event ? [event.venue, event.note].filter(Boolean).join(' · ') : next ? `${next.title} · ${next.date} · ${next.venue}` : 'Fixtures, results, grounds and stories in one place.'}</p>
              <span className="hero-actions">
                <button type="button" className="hero-btn" onClick={() => onOpenSchedule({ filter: event ? 'Nepal' : 'All' })}>Explore</button>
                {event && <button type="button" className="hero-save" aria-pressed={eventSaved} aria-label={eventSaved ? `Remove ${event.short || event.title} from saved` : `Save ${event.short || event.title}`} onClick={() => toggleSaved(eventId)}>
                  <I.Bookmark size={15} filled={eventSaved} />
                </button>}
              </span>
            </span>
          </Frame>
        </article>
      </section>

      <Divider />
      <section className="section discover-desk" aria-label="Match desk">
        <SectionHead title="Match desk">
          <button type="button" className="section-link" onClick={() => onOpenSchedule({})}>All matches <I.Chevron size={13} /></button>
        </SectionHead>
        <div className="card desk-card">
          {next ? <button type="button" className="desk-row" onClick={() => onOpenSchedule({ query: next.title })}>
            <span className="desk-kicker">Next fixture · {parts(next.date).date} {parts(next.date).month}</span>
            <strong>{next.title}</strong><span className="desk-meta">{next.time} · {next.venue}</span>
          </button> : <div className="desk-row"><span className="desk-kicker">Next fixture</span><strong>No confirmed fixture listed</strong></div>}
          {recent && <button type="button" className="desk-row" onClick={() => onOpenSchedule({ query: recent.lines.map((l) => l.team).join(' v ') })}>
            <span className="desk-kicker">Recent result · {parts(recent.date).date} {parts(recent.date).month}</span>
            <strong>{recent.lines.map((l) => l.team).join(' v ')}</strong><span className="desk-meta">{recent.summary}</span>
          </button>}
        </div>
      </section>

      <BrowseRow title="Competitions">
        {competitions.map((item) => {
          const followOnly = item.topic && !hasMatches(item.filter);
          return <Poster key={item.id} item={followOnly ? { ...item, tag: following.includes(item.topic) ? 'Following' : 'Follow', caption: 'Get updates when matches are added' } : item} pressed={followOnly ? following.includes(item.topic) : undefined} onOpen={openCompetition} />;
        })}
      </BrowseRow>

      <BrowseRow title="Grounds">
        {GROUNDS.map((item) => <Poster key={item.id} item={item} onOpen={({ query }) => onOpenSchedule({ query })} />)}
      </BrowseRow>

      <BrowseRow title="Follow">
        {followables.map((item) => {
          const on = following.includes(item.id);
          return (
            <button key={item.id} type="button" className="disc" aria-pressed={on} onClick={() => toggleFollow(item.id)}>
              <span className="disc-mark">
                {item.id === 'nepal' || item.id === 'women' ? <TeamMark name="Nepal" size={30} /> : <I.Trophy size={20} />}
                <span className="disc-state">{on ? <I.Check size={11} sw={2.2} /> : <I.Plus size={11} />}</span>
              </span>
              <strong>{item.name}</strong><span>{item.kind}</span>
            </button>
          );
        })}
      </BrowseRow>

      {stories.length > 0 && <BrowseRow title="Stories">
        {stories.map((story) => {
          const Tag = story.sourceUrl ? 'a' : 'article';
          return <Tag key={story.id} href={story.sourceUrl || undefined} target={story.sourceUrl ? '_blank' : undefined} rel={story.sourceUrl ? 'noopener noreferrer' : undefined} className="card story">
            <Frame src={story.image || story.imageUrl || (story.art ? `/art/${story.art}.svg` : undefined)} className="story-frame" />
            <span className="body"><strong>{story.title}</strong><span>{story.source}</span></span>
          </Tag>;
        })}
      </BrowseRow>}

      <Divider />
      <section className="section">
        <button type="button" className="ribbon simple" onClick={() => onOpenSchedule({})}>
          <span className="lead"><I.Calendar size={15} /></span>
          <span className="grow">Full schedule and results</span>
          <span className="chev"><I.Chevron size={14} /></span>
        </button>
        <p className="footnote"><a className="photo-credit-link" href="/photo-credits.html" target="_blank" rel="noreferrer">Photos: Wikimedia Commons, CC BY-SA</a></p>
      </section>
    </>
  );
}
