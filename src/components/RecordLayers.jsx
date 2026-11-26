import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import { ConfirmLayer, PushLayer } from './InteractionLayer.jsx';
import { LiveTiles } from './LiveCard.jsx';
import SourceSheet from './SourceSheet.jsx';
import { MarkPair, TeamMark } from './TeamMark.jsx';
import { SaveButton, parts, relativeDay } from './ui.jsx';
import { useContent } from '../lib/content.jsx';
import { signInWithGoogle, signOutUser, watchUser } from '../lib/firebase.js';
import { kickoffUTC } from '../lib/statcard.js';

const titleOfResult = (result) => result.lines?.map((line) => line.team).join(' v ') || result.label || 'Match result';

function finalResult(final) {
  if (!final?.result) return null;
  return {
    id: 'npl-final-result',
    competition: 'NPL',
    label: `NPL Final · ${final.venue} · ${parts(final.date).date} ${parts(final.date).month}`,
    lines: final.result.lines,
    summary: final.result.detail ? `${final.result.summary} · ${final.result.detail}` : final.result.summary,
    source: final.result.source,
    sourceUrl: final.result.sourceUrl,
  };
}

export function getSavedItems(content, saved) {
  return saved.map((id) => {
    if (id === content.featuredEvent?.id) {
      const event = content.featuredEvent;
      const start = parts(event.start);
      const end = parts(event.end);
      return { id, title: event.title, meta: `${start.date} ${start.month} – ${end.date} ${end.month} · ${event.venue}`, layer: { type: 'event', id } };
    }
    if (id === 'npl-final' && content.nplFinal) {
      const final = content.nplFinal;
      return {
        id,
        title: `${final.home} v ${final.away}`,
        meta: `NPL final · ${relativeDay(final.date, content.today)} · ${final.venue}`,
        layer: { type: final.result ? 'result' : 'fixture', id },
      };
    }
    const fixture = content.fixtures.find((item) => item.id === id);
    if (fixture) {
      const date = parts(fixture.date);
      return { id, title: fixture.title, meta: `${date.date} ${date.month} · ${fixture.time} · ${fixture.venue}`, layer: { type: 'fixture', id } };
    }
    const result = content.results.find((item) => item.id === id);
    if (result) return { id, title: titleOfResult(result), meta: result.summary, layer: { type: 'result', id } };
    return { id, title: 'Saved match unavailable', meta: 'This record is no longer in the current feed. Remove it from Saved or check again later.', missing: true };
  });
}

function MissingRecord({ onClose, loading }) {
  return (
    <PushLayer title="Record unavailable" eyebrow="Current feed" onClose={onClose}>
      <div className="layer-state">
        <I.CricketBall size={24} />
        <h2>{loading ? 'Loading the latest record…' : 'This record is not in the current feed'}</h2>
        <p>{loading ? 'The detail view will update when the current data arrives.' : 'It may have been removed or replaced during a refresh. Go back and choose another available record.'}</p>
        <button type="button" className="layer-secondary-action" onClick={onClose}>Back to results</button>
      </div>
    </PushLayer>
  );
}

function DetailList({ items }) {
  const visible = items.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!visible.length) return null;
  return <dl className="detail-list">{visible.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function RecordActions({ saved, onSave, saveLabel, onAsk }) {
  return (
    <div className="record-actions">
      <button type="button" className="layer-secondary-action" aria-pressed={saved} onClick={onSave}>
        <I.Bookmark size={17} filled={saved} />{saved ? 'Saved' : saveLabel || 'Save match'}
      </button>
      <button type="button" className="layer-secondary-action" onClick={onAsk}>
        <I.Spark size={16} />Ask Cue
      </button>
    </div>
  );
}

function FixtureDetail({ fixture, content, prefs, onClose, onAsk }) {
  const isFinal = fixture.id === 'npl-final';
  const date = parts(fixture.date);
  const started = (kickoffUTC(fixture.date, fixture.time) ?? Infinity) <= Date.now();
  return (
    <PushLayer title={isFinal ? 'NPL final' : 'Match details'} eyebrow={fixture.competition || 'Fixture'} onClose={onClose}>
      <article className="record-detail">
        <span className="record-status">{relativeDay(fixture.date, content.today)} · {['Today', 'Tomorrow'].includes(relativeDay(fixture.date, content.today)) ? `${date.day} ` : ''}{date.date} {date.month}</span>
        <h2>{fixture.title}</h2>
        <p className="record-lede">{started ? 'The scheduled start has arrived. A live score appears only after independent verification.' : 'Confirmed fixture information, shown in Nepal time.'}</p>
        <DetailList items={[["Start", fixture.time || 'Time to be confirmed'], ["Venue", fixture.venue || 'Venue to be confirmed'], ["Competition", fixture.competition], ["Note", fixture.note]]} />
        <RecordActions saved={prefs.saved.includes(fixture.id)} onSave={() => prefs.toggleSaved(fixture.id)} onAsk={onAsk} />
        <p className="record-footnote">All fixture times are NPT. Changes appear after the next verified feed update.</p>
      </article>
    </PushLayer>
  );
}

function ResultDetail({ result, prefs, onClose, onAsk, onOpenLayer }) {
  const title = titleOfResult(result);
  const sourceUrl = result.sourceUrl;
  return (
    <PushLayer title="Match result" eyebrow={result.competition || 'Result'} onClose={onClose}>
      <article className="record-detail">
        <span className="record-status">{result.label}</span>
        <h2>{title}</h2>
        {result.status && <span className="result-detail-status">{result.status}</span>}
        <div className="result-scorecard" aria-label="Scorecard summary">
          {result.lines?.map((line, index) => (
            <div key={`${line.team}-${index}`} className={index ? 'secondary' : ''}>
              <span><TeamMark name={line.team} size={18} />{line.team}</span>
              <strong>{line.score}{line.overs && <small>{line.overs} overs</small>}</strong>
            </div>
          ))}
        </div>
        <p className="result-detail-summary">{result.summary}</p>
        <RecordActions saved={prefs.saved.includes(result.id === 'npl-final-result' ? 'npl-final' : result.id)} onSave={() => prefs.toggleSaved(result.id === 'npl-final-result' ? 'npl-final' : result.id)} onAsk={onAsk} />
        {(result.source || sourceUrl) && <div className="record-source"><span>Source</span>{sourceUrl ? <button type="button" onClick={() => onOpenLayer({ type: 'source', title: 'Result source', source: { label: result.source || 'Original scorecard', url: sourceUrl } })}>{result.source || 'Original scorecard'}<I.Chevron size={14} /></button> : <strong>{result.source}</strong>}</div>}
      </article>
    </PushLayer>
  );
}

function checkedLabel(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Recently checked';
  return `Checked ${new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time)} NPT`;
}

function LiveDetail({ match, onClose, onAsk, onOpenLayer }) {
  const title = `${match.batting.name} v ${match.bowling.name}`;
  const need = match.target != null ? Math.max(0, match.target - match.batting.runs) : null;
  return (
    <PushLayer title="Live match" eyebrow={match.series || 'Verified score'} onClose={onClose}>
      <article className="record-detail live-detail">
        <span className="record-status live"><span className="live-dot" />Live right now</span>
        <h2>{title}</h2>
        <p className="record-lede">{match.venue}</p>
        <LiveTiles match={match} />
        <DetailList items={[["Target", match.target], ["Runs needed", need], ["Balls left", match.ballsLeft], ["Wickets left", match.batting.wickets != null ? 10 - match.batting.wickets : null], ["Current run rate", match.runRate], ["Required run rate", match.requiredRate]]} />
        <button type="button" className="layer-secondary-action record-cue-action" onClick={onAsk}><I.Spark size={16} />Ask Cue about this match</button>
        <div className="record-source"><span>{match.verifiedAt ? checkedLabel(match.verifiedAt) : 'Current verified score'}</span>{match.sourceUrl && <button type="button" onClick={() => onOpenLayer({ type: 'source', title: 'Score source', source: { label: match.source || 'Scorecard', url: match.sourceUrl } })}>{match.source || 'Scorecard'}<I.Chevron size={14} /></button>}</div>
        <p className="record-footnote">Scores are published only after independent source agreement. Brief delays are possible during verification.</p>
      </article>
    </PushLayer>
  );
}

function StoryDetail({ story, onClose, onOpenLayer }) {
  const image = story.image || story.imageUrl || (story.art ? `/art/${story.art}.svg` : null);
  const source = { label: story.source || 'Original publisher', url: story.sourceUrl };
  return (
    <PushLayer title={story.world ? 'World cricket' : 'Story'} eyebrow={story.source || 'Cricket news'} onClose={onClose}>
      <article className="record-detail story-detail">
        {image && <img className="story-detail-image" src={image} alt="" />}
        <span className="record-status">{story.publishedAt ? checkedLabel(story.publishedAt).replace('Checked ', 'Published ') : story.date}</span>
        <h2>{story.title}</h2>
        {story.blurb && <p className="record-lede">{story.blurb}</p>}
        <p className="story-detail-note">willowPoint publishes the verified headline and attribution here. The publisher’s original report contains the full story.</p>
        {story.sourceUrl ? <button type="button" className="layer-primary-link" onClick={() => onOpenLayer({ type: 'source', title: 'Story source', source })}>Read at {story.source || 'original source'}<I.ArrowUp size={17} style={{ transform: 'rotate(45deg)' }} /></button> : <p className="record-footnote">No original article link is attached to this record.</p>}
      </article>
    </PushLayer>
  );
}

function EventDetail({ event, content, prefs, onClose, onOpenLayer, onSeeAll, onAsk }) {
  const start = parts(event.start);
  const end = parts(event.end);
  const games = content.fixtures.filter((fixture) => fixture.event === event.id).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <PushLayer title={event.short || 'Competition'} eyebrow="Event" onClose={onClose}>
      <article className="record-detail">
        <span className="record-status"><I.Trophy size={15} />{start.date} {start.month} – {end.date} {end.month}</span>
        <h2>{event.title}</h2>
        <p className="record-lede">{[event.venue, event.note].filter(Boolean).join(' · ')}</p>
        <RecordActions saved={prefs.saved.includes(event.id)} saveLabel="Save event" onSave={() => prefs.toggleSaved(event.id)} onAsk={onAsk} />
        <section className="record-subsection"><h3>Matches in this event</h3>{games.length ? <div className="card">{games.map((fixture) => <div className="list-row" key={fixture.id}><button type="button" className="record-row-main" onClick={() => onOpenLayer({ type: 'fixture', id: fixture.id })}><span className="date-block"><b>{parts(fixture.date).date}</b><small>{parts(fixture.date).month}</small></span><span className="row-text"><strong>{fixture.title}</strong><span>{fixture.time} · {fixture.venue}</span></span><I.Chevron size={15} /></button></div>)}</div> : <p className="empty">No verified fixtures are attached to this event yet.</p>}</section>
        {games.length > 0 && <button type="button" className="layer-secondary-action" onClick={() => onSeeAll(games[0].competition)}>View full match list<I.Chevron size={15} /></button>}
      </article>
    </PushLayer>
  );
}

function SavedDetail({ content, prefs, onClose, onOpenLayer }) {
  const items = getSavedItems(content, prefs.saved);
  return (
    <PushLayer title="Saved matches" eyebrow={`${items.length} ${items.length === 1 ? 'record' : 'records'}`} onClose={onClose}>
      <section className="saved-layer-content">
        {content.loadState === 'loading' && !items.length ? <div className="layer-state"><h2>Loading saved matches…</h2><p>Your saved records will appear when the current feed arrives.</p></div> : items.length ? <div className="card">{items.map((item) => <div className="list-row saved-layer-row" key={item.id}>{item.missing ? <span className="record-row-main"><span className="row-text"><strong>{item.title}</strong><span>{item.meta}</span></span></span> : <button type="button" className="record-row-main" onClick={() => onOpenLayer(item.layer)}><span className="row-text"><strong className="with-marks"><MarkPair title={item.title} size={14} />{item.title}</strong><span>{item.meta}</span></span><I.Chevron size={15} /></button>}<SaveButton label={item.title} saved onToggle={() => prefs.toggleSaved(item.id)} /></div>)}</div> : <div className="layer-state"><I.Bookmark size={25} /><h2>No saved matches yet</h2><p>Tap the bookmark on a fixture, result, or event to keep it here.</p></div>}
      </section>
    </PushLayer>
  );
}

function AccountDetail({ onClose, onConfirmSignOut }) {
  const [user, setUser] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => watchUser(setUser), []);
  const authed = user && !user.isAnonymous;
  const google = async () => {
    setBusy(true);
    setError('');
    try { await signInWithGoogle(); } catch (exception) {
      setError(exception.code === 'auth/operation-not-allowed' ? 'Google sign-in is not enabled for this project.' : exception.code === 'auth/popup-closed-by-user' ? '' : exception.message || 'Sign-in failed. Check your connection and try again.');
    } finally { setBusy(false); }
  };
  return (
    <PushLayer title="Your account" eyebrow={authed ? 'Signed in' : 'Sync and sign in'} onClose={onClose}>
      <div className="record-detail">
        <span className="account-layer-mark"><I.User size={25} /></span>
        <h2>{authed ? user.email || 'Google account' : 'Keep your cricket with you'}</h2>
        <p className="record-lede">{authed ? 'Your follows and saved matches are linked to this account.' : 'Continue with Google to link your follows and saved matches. You can also keep using willowPoint on this device without signing in.'}</p>
        {authed ? <button type="button" className="layer-secondary-action danger" onClick={onConfirmSignOut}>Sign out</button> : <button type="button" className="layer-primary-link" disabled={busy} onClick={google}>{busy ? 'Opening Google…' : 'Continue with Google'}<I.ArrowUp size={17} /></button>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!authed && <button type="button" className="layer-text-action" onClick={onClose}>Continue on this device</button>}
      </div>
    </PushLayer>
  );
}

function SignOutConfirmation({ onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true);
    setError('');
    try { await signOutUser(); onClose(); } catch (exception) { setError(exception.message || 'Could not sign out. Try again.'); } finally { setBusy(false); }
  };
  return (
    <ConfirmLayer title="Sign out?" eyebrow="Account decision" onClose={onClose}>
      <div className="confirm-content"><p>Your saved matches and follows stay on this device. Sign in with Google again to access your linked account.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="confirm-actions"><button type="button" className="layer-secondary-action" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="layer-secondary-action danger" disabled={busy} onClick={confirm}>{busy ? 'Signing out…' : 'Sign out'}</button></div></div>
    </ConfirmLayer>
  );
}

export default function RecordLayers({ layers, prefs, onClose, onOpenLayer, askCue, go }) {
  const content = useContent();
  const visibleLayers = layers.filter((item) => !item.type.startsWith('cue-'));

  const renderLayer = (layer) => {
    if (layer.type === 'source') return <SourceSheet source={layer.source} title={layer.title} onClose={onClose} />;
    if (layer.type === 'saved') return <SavedDetail content={content} prefs={prefs} onClose={onClose} onOpenLayer={onOpenLayer} />;
    if (layer.type === 'account') return <AccountDetail onClose={onClose} onConfirmSignOut={() => onOpenLayer({ type: 'confirm-signout' })} />;
    if (layer.type === 'confirm-signout') return <SignOutConfirmation onClose={onClose} />;
    if (content.loadState === 'loading' && !content.fixtures.length && !content.results.length && !content.liveMatches.length) return <MissingRecord loading onClose={onClose} />;

    if (layer.type === 'fixture') {
      const final = layer.id === 'npl-final' && content.nplFinal && !content.nplFinal.result ? content.nplFinal : null;
      const fixture = final ? { ...final, id: 'npl-final', title: `${final.home} v ${final.away}`, competition: 'NPL' } : content.fixtures.find((item) => item.id === layer.id);
      return fixture ? <FixtureDetail fixture={fixture} content={content} prefs={prefs} onClose={onClose} onAsk={() => askCue(`What should I know about ${fixture.title} on ${fixture.date}?`)} /> : <MissingRecord onClose={onClose} />;
    }
    if (layer.type === 'result') {
      const result = layer.id === 'npl-final' || layer.id === 'npl-final-result' ? finalResult(content.nplFinal) : content.results.find((item) => item.id === layer.id);
      return result ? <ResultDetail result={result} prefs={prefs} onClose={onClose} onOpenLayer={onOpenLayer} onAsk={() => askCue(`Recap this result: ${titleOfResult(result)}. ${result.summary}`)} /> : <MissingRecord onClose={onClose} />;
    }
    if (layer.type === 'live') {
      const match = content.liveMatches.find((item) => item.id === layer.id);
      return match ? <LiveDetail match={match} onClose={onClose} onOpenLayer={onOpenLayer} onAsk={() => askCue(`Give me the current match situation for ${match.batting.name} v ${match.bowling.name}.`)} /> : <MissingRecord onClose={onClose} />;
    }
    if (layer.type === 'story') {
      const story = content.stories.find((item) => item.id === layer.id) || content.worldNews.find((item) => item.id === layer.id);
      return story ? <StoryDetail story={{ ...story, world: content.worldNews.some((item) => item.id === layer.id) }} onClose={onClose} onOpenLayer={onOpenLayer} /> : <MissingRecord onClose={onClose} />;
    }
    if (layer.type === 'event') {
      const event = content.featuredEvent?.id === layer.id ? content.featuredEvent : null;
      return event ? <EventDetail event={event} content={content} prefs={prefs} onClose={onClose} onOpenLayer={onOpenLayer} onSeeAll={(filter) => go('discover', filter)} onAsk={() => askCue(`Give me a briefing on ${event.title}.`)} /> : <MissingRecord onClose={onClose} />;
    }
    return <MissingRecord onClose={onClose} />;
  };

  return visibleLayers.map((layer, index) => {
    const top = index === visibleLayers.length - 1;
    return <div key={`${index}-${layer.type}-${layer.id || ''}`} inert={top ? undefined : ''} aria-hidden={top ? undefined : true}>{renderLayer(layer)}</div>;
  });
}
