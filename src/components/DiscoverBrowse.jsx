import * as I from './Icons.jsx';
import FixtureRow from './FixtureRow.jsx';
import { SaveButton, SectionHead, parts } from './ui.jsx';
import { useContent } from '../lib/content.jsx';
import { upcomingFixtures } from '../lib/selectors.js';

export function StoryCard({ story, onOpen }) {
  const image = story.image || story.imageUrl;
  return (
    <button type="button" className="story-card" onClick={onOpen}>
      {image && <img className="story-image" src={image} alt="" loading="lazy" />}
      <span className="tagrow"><span className="mini-chip">{story.source}</span></span>
      <h3>{story.title}</h3>
      {story.blurb && <p className="dek">{story.blurb}</p>}
      <span className="story-read">Original source <I.ArrowUp size={12} style={{ transform: 'rotate(45deg)' }} /></span>
    </button>
  );
}

export default function DiscoverBrowse({ saved, toggleSaved, following, toggleFollow, onOpenSchedule, onOpenRecord }) {
  const { today, loadState, liveState, stories, worldNews, fixtures, liveMatches, featuredEvent, followTopics } = useContent();
  const upcoming = upcomingFixtures(fixtures, today).slice(0, 3);
  const followedTopics = following.filter((id) => followTopics.some((topic) => topic.id === id)).length;

  return (
    <div className="discover-overview">
      <section>
        <SectionHead title="Live now" leading={liveMatches.length ? <span className="pulse" /> : null}>
          {liveMatches.length > 0 && <span className="label">{liveMatches.length} {liveMatches.length === 1 ? 'match' : 'matches'}</span>}
        </SectionHead>
        {liveMatches.length ? (
          <div className="recap-grid" role="group" aria-label="Live matches, scroll for more">
            {liveMatches.map((match) => {
              const need = match.target != null ? Math.max(0, match.target - match.batting.runs) : null;
              return (
                <button type="button" className="rtile" key={match.id} onClick={() => onOpenRecord({ type: 'live', id: match.id })}>
                  <span className="ev-head">
                    <span className="cal"><b>{match.batting.runs}/{match.batting.wickets}</b><span>{match.batting.overs} OV</span></span>
                    <span className="ev-t"><b>{match.batting.name} v {match.bowling.name}</b></span>
                    {need > 0 && match.ballsLeft != null && <span className="mini-chip is-live">{need} off {match.ballsLeft}</span>}
                  </span>
                  <span className="ev-sub">{match.series} · {match.venue}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="empty-state compact">{loadState === 'loading' ? 'Checking the verified live feed…' : liveState === 'none' ? 'No covered match is live right now.' : 'Live scores are unavailable until a fresh source check succeeds.'}</p>}
      </section>

      <section>
        <SectionHead title="Beyond the boundary" className="between">
          <button type="button" className="seclink" onClick={() => onOpenSchedule({})}>All fixtures →</button>
        </SectionHead>
        {upcoming.length > 0 && <div className="fixture-list">{upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />)}</div>}
        {!upcoming.length && <p className="empty-state compact">{loadState === 'loading' ? 'Checking confirmed fixtures…' : loadState === 'error' ? 'Fixtures could not refresh. Please try again later.' : 'No confirmed upcoming fixtures are listed yet.'}</p>}
      </section>

      {featuredEvent && (
        <section>
          <SectionHead title="Featured" className="between" />
          <article className="event-card">
            <button type="button" className="event-open" onClick={() => onOpenRecord({ type: 'event', id: featuredEvent.id })}>
              <span className="ev-head"><span className="cal"><b>{String(parts(featuredEvent.start).date).padStart(2, '0')}</b><span>{parts(featuredEvent.start).month}</span></span><span className="ev-t"><b>{featuredEvent.short || featuredEvent.title}</b></span></span>
              <span className="ev-sub">{featuredEvent.title} · {featuredEvent.venue}{featuredEvent.note ? ` · ${featuredEvent.note}` : ''}</span>
            </button>
            <SaveButton label={featuredEvent.title} saved={saved.includes(featuredEvent.id)} onToggle={() => toggleSaved(featuredEvent.id)} />
          </article>
        </section>
      )}

      {stories.length > 0 && (
        <section>
          <SectionHead title="This week in Nepali cricket" className="between" />
          <div className="story-track" role="group" aria-label="Nepali cricket stories, scroll for more">
            {stories.map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpenRecord({ type: 'story', id: story.id })} />)}
          </div>
        </section>
      )}

      {worldNews.length > 0 && (
        <section>
          <SectionHead title="Top stories" className="between" />
          <div className="news-list">{worldNews.map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpenRecord({ type: 'story', id: story.id })} />)}</div>
        </section>
      )}

      <section>
        <SectionHead title="Your cricket" className="between" />
        {followTopics.length > 0 ? <div className="teams">{followTopics.map((item) => {
          const on = following.includes(item.id);
          return <button key={item.id} type="button" className={`team-pill${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleFollow(item.id)}><span className="ind" />{item.name}</button>;
        })}</div> : <p className="empty-state compact">{loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available to follow yet.'}</p>}
        {followTopics.length > 0 && <p className="followcount">{followedTopics} of {followTopics.length} followed</p>}
      </section>

      <p className="data-note"><I.Check size={13} />Records appear after source validation. Original publishers remain linked where supplied.</p>
    </div>
  );
}
