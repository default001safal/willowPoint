import { useState } from 'react';
import * as I from './Icons.jsx';
import { Divider, SectionHead } from './ui.jsx';
import { TeamMark } from './TeamMark.jsx';
import { followables } from '../data.js';
import { useContent } from '../lib/content.jsx';

// The portrait browse layout recovered from the original polish-review build.
// Use Commons' supported thumbnail widths; the former 480px URLs returned 400.
const thumb = (path, name, width = 330) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${name}/${width}px-${name}`;
const PHOTOS = {
  hero: thumb('e/e3', 'Kirtipur_Cricket_Stadium.jpg', 960),
  npl: thumb('0/05', 'Kirtipur_Criket_Ground1.JPG'),
  league: thumb('b/ba', 'Kirtipur_Criket_Ground3.JPG'),
  women: thumb('4/41', 'Kirtipur_Criket_Ground4.JPG'),
  youth: thumb('7/7d', 'Kirtipur_Criket_Ground5.JPG'),
  mulpani: thumb('c/c1', 'Mulpani_cricket_ground.jpg', 960),
  pokhara: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Pokhara_Stadium_2022.jpg',
};

const COMPETITIONS = [
  { id: 'qualifier', title: 'Qualifier Play-off', caption: 'Eight teams, December', tag: 'Dec 4', photo: PHOTOS.hero, filter: 'Nepal' },
  { id: 'npl', title: 'Nepal Premier League', caption: 'Eight cities, one trophy', tag: 'Champions', photo: PHOTOS.npl, filter: 'NPL' },
  { id: 'league', title: 'World Cup League 2', caption: "Nepal's ODI league", tag: 'Ongoing', photo: PHOTOS.league, filter: 'Nepal' },
  { id: 'women', title: 'Nepal Women', caption: 'The national side', tag: 'Follow', photo: PHOTOS.women, filter: 'Nepal Women' },
  { id: 'u19', title: 'Nepal U19', caption: 'The next ones through', tag: 'Youth', photo: PHOTOS.youth, filter: 'Nepal U19' },
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

function Poster({ item, onOpen }) {
  return (
    <button type="button" className="poster" onClick={() => onOpen(item)}>
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

export default function DiscoverBrowse({ saved, toggleSaved, following, toggleFollow, onOpenSchedule, onStory }) {
  const { stories, featuredEvent } = useContent();
  const eventId = featuredEvent?.id || 'cwc-qp-2026';
  const eventSaved = saved.includes(eventId);
  return (
    <>
      <section className="section hero-section">
        <article className="hero">
          <Frame src={PHOTOS.hero} className="hero-frame">
            <span className="hero-copy">
              <span className="hero-kicker">4–21 Dec · Kirtipur</span>
              <h2>The road to the World Cup</h2>
              <p>Eight teams come to Kirtipur in December. The top four go through.</p>
              <span className="hero-actions">
                <button type="button" className="hero-btn" onClick={() => onOpenSchedule({ filter: 'Nepal' })}>Explore</button>
                <button type="button" className="hero-save" aria-pressed={eventSaved} aria-label={eventSaved ? 'Remove World Cup Qualifier from saved' : 'Save World Cup Qualifier'} onClick={() => toggleSaved(eventId)}>
                  <I.Bookmark size={15} filled={eventSaved} />
                </button>
              </span>
            </span>
          </Frame>
        </article>
      </section>

      <BrowseRow title="Competitions">
        {COMPETITIONS.map((item) => <Poster key={item.id} item={item} onOpen={({ filter }) => onOpenSchedule({ filter })} />)}
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

      <BrowseRow title="Stories">
        {stories.map((story) => (
          <button key={story.id} type="button" className="card story" onClick={() => onStory(story)}>
            <Frame src={story.image || story.imageUrl || (story.art ? `/art/${story.art}.svg` : undefined)} className="story-frame" />
            <span className="body"><strong>{story.title}</strong><span>{story.source}</span></span>
          </button>
        ))}
      </BrowseRow>

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
