import * as I from '../components/Icons.jsx';
import LiveSection from '../components/LiveCard.jsx';
import NextForNepal from '../components/NextForNepal.jsx';
import { SaveButton, ScreenMasthead, SectionHead, parts } from '../components/ui.jsx';
import { useContent } from '../lib/content.jsx';
import { fixturesForEvent, recentResults, resultTitle } from '../lib/selectors.js';
import { SearchLauncher } from '../components/Search.jsx';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function QuickRecap({ onOpenRecord }) {
  const { results, today } = useContent();
  const recent = recentResults(results, today).slice(0, 5);
  if (!recent.length) return null;
  return (
    <section className="recap-section">
      <SectionHead title="Quick recap" className="recap-head" />
      <div className="recap-grid" role="group" aria-label="Recent results, scroll for more">
        {recent.map((result) => {
          const date = parts(result.date);
          return (
            <button type="button" className="rtile" key={result.id} onClick={() => onOpenRecord({ type: 'result', id: result.id })}>
              <span className="ev-head">
                <span className="cal"><b>{String(date.date).padStart(2, '0')}</b><span>{date.month}</span></span>
                <span className="ev-t"><b>{resultTitle(result)}</b></span>
                <span className="mini-chip">{result.competition || 'Result'}</span>
              </span>
              <span className="ev-sub">{result.summary}</span>
              <span className="record-chevron"><I.Chevron size={14} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EventCard({ event, saved, toggleSaved, onSeeAll, onOpenRecord, onAsk }) {
  const { fixtures, today } = useContent();
  const games = fixturesForEvent(event, fixtures)
    .filter((fixture) => fixture.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));
  const start = parts(event.start);
  const end = parts(event.end);
  return (
    <section className="featured-section">
      <SectionHead title={event.short || event.title} className="between">
        <button type="button" className="seclink" onClick={() => onSeeAll(games[0]?.competition || event.competition || 'All')}>All games →</button>
      </SectionHead>
      <article className="event-card">
        <button type="button" className="event-open" onClick={() => onOpenRecord({ type: 'event', id: event.id })}>
          <span className="ev-head"><span className="cal"><b>{String(start.date).padStart(2, '0')}</b><span>{start.month}</span></span><span className="ev-t"><b>{event.title}</b></span></span>
          <span className="ev-sub">{start.date} {start.month} – {end.date} {end.month} · {event.venue}{event.note ? ` · ${event.note}` : ''}</span>
          {games.length > 0 && <span className="event-next">Next: {games[0].title}</span>}
        </button>
        <SaveButton label={event.title} saved={saved.includes(event.id)} onToggle={() => toggleSaved(event.id)} />
      </article>
      <button type="button" className="layer-text-action" onClick={() => onAsk(event)}>Briefing with Cue</button>
    </section>
  );
}

function HomeStories({ stories, onOpenRecord, onSeeAll }) {
  if (!stories.length) return null;
  return (
    <section className="storyrow">
      <SectionHead title="Top stories" className="between">
        <button type="button" className="seclink" onClick={onSeeAll}>Explore →</button>
      </SectionHead>
      <div className="story-track" role="group" aria-label="Top stories, scroll for more">
        {stories.map((story) => {
          const image = story.image || story.imageUrl;
          return (
            <button type="button" className="story-card" key={story.id} onClick={() => onOpenRecord({ type: 'story', id: story.id })}>
              {image && <img className="story-image" src={image} alt="" loading="lazy" />}
              <span className="tagrow"><span className="mini-chip">{story.source}</span></span>
              <h3>{story.title}</h3>
              {story.blurb && <p className="dek">{story.blurb}</p>}
              <span className="story-read">Read story <I.ArrowUp size={12} style={{ transform: 'rotate(45deg)' }} /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function HomeScreen({ saved, toggleSaved, go, askCue, onOpenSaved, onOpenRecord, onOpenSearch }) {
  const { liveMatches, liveState, loadState, stories, featuredEvent } = useContent();

  return (
    <main className="screen home-screen">
      <ScreenMasthead onProfile={() => go('profile')} />
      <h1 className="greet">{greeting()}</h1>
      <SearchLauncher onOpen={() => onOpenSearch()} />
      <div className="pills home-pills" aria-label="Quick destinations">
        <button type="button" className="chip cue-chip" onClick={() => askCue('Give me my quick Nepal cricket briefing')}><I.Spark size={13} />Cue’s bird’s-eye view</button>
        <button type="button" className="chip" onClick={() => go('discover', 'Nepal')}><I.Calendar size={13} />Nepal’s next match</button>
        {featuredEvent && <button type="button" className="chip" onClick={() => onOpenSearch({ query: featuredEvent.title, scope: 'Events' })}><I.Trophy size={13} />{featuredEvent.short || featuredEvent.title}</button>}
        <button type="button" className="chip" onClick={onOpenSaved}><I.Bookmark size={13} />Saved</button>
      </div>

      <LiveSection matches={liveMatches} state={liveState} loading={loadState === 'loading'} onSeeAll={() => go('discover', 'All')} onOpenMatch={(match) => onOpenRecord({ type: 'live', id: match.id })} />
      <QuickRecap onOpenRecord={onOpenRecord} />
      <NextForNepal saved={saved} toggleSaved={toggleSaved} onSeeAll={() => go('discover', 'Nepal')} onOpenRecord={onOpenRecord} />
      {featuredEvent && <EventCard event={featuredEvent} onAsk={(event) => askCue(`Give me a current briefing on ${event.title}.`)} saved={saved} toggleSaved={toggleSaved} onSeeAll={(filter) => go('discover', filter)} onOpenRecord={onOpenRecord} />}
      <HomeStories stories={stories} onOpenRecord={onOpenRecord} onSeeAll={() => go('discover', 'News')} />
    </main>
  );
}
