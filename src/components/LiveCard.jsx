import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { TeamMark } from './TeamMark.jsx';
import { overMarkers } from '../lib/innings.js';

function OverBar({ team, limit, active }) {
  const markers = overMarkers(team, limit, active);
  return (
    <div className="ovbar-row">
      <div className="ovbar" aria-hidden="true">
        {markers.map((marker) => (
          <i key={marker.over} className={marker.state === 'completed' ? 'b' : marker.state === 'current' ? 'now' : ''} />
        ))}
      </div>
      <span className="ovbar-label">{team.overs ?? '—'}{limit ? `/${limit}` : ''}</span>
    </div>
  );
}

function ScoreRow({ team, active }) {
  return (
    <div className={`live-row${active ? '' : ' done'}`}>
      <span className="team">
        <TeamMark name={team.name} size={22} />
        <span className="tname">{team.name}</span>
        {active && <><span className="bat-dot">·</span><I.CricketBat size={14} className="bat-glyph" /></>}
      </span>
      <span className="num">{team.runs}<i>{team.wickets != null ? `/${team.wickets}` : ''}</i></span>
      <span className="ov">{team.overs ?? '—'}</span>
    </div>
  );
}

export function LiveScoreboard({ match, detail = false }) {
  const { batting, bowling } = match;
  const need = match.target != null ? Math.max(0, match.target - batting.runs) : null;
  const chasing = need != null && need > 0 && match.ballsLeft != null;
  const limit = Number.isInteger(match.overLimit) ? match.overLimit : Number.isInteger(match.totalOvers) ? match.totalOvers : 20;
  const hasPlayers = (match.batters?.length || match.bowlers?.length) > 0;

  return (
    <div className={`live-scoreboard${detail ? ' detail' : ''}`} aria-label={`${batting.name} ${batting.runs} for ${batting.wickets}, ${bowling.name} ${bowling.runs} for ${bowling.wickets}`}>
      {!detail && <div className="live-teams">
        <ScoreRow team={batting} active />
        <ScoreRow team={bowling} active={false} />
      </div>}
      {!detail && <div className="ovbar-peek"><OverBar team={batting} limit={limit} active /></div>}
      {!detail && (chasing || match.runRate) && (
        <div className="live-need live-need-peek">
          <span className="need">{chasing ? <><I.Target size={13} />{need} off {match.ballsLeft}</> : <><I.CricketBall size={13} />In progress</>}</span>
          <span className="rates">{match.runRate ? `CRR ${match.runRate}` : ''}{chasing && match.requiredRate ? ` · REQ ${match.requiredRate}` : ''}</span>
        </div>
      )}
      {detail && (
        <div className="live-expand-in">
          <OverBar team={batting} limit={limit} active />
          <div className="mini-row"><b>Match situation</b><span>{match.venue || ''}</span></div>
          {match.target != null && <div className="mini-row"><span>Target</span><span className="r">{match.target}</span></div>}
          {match.runRate && <div className="mini-row"><span>Current run rate</span><span className="r">{match.runRate}</span></div>}
          {match.requiredRate && <div className="mini-row"><span>Required run rate</span><span className="r">{match.requiredRate}</span></div>}
          {match.batters?.length > 0 && <div className="player-lines"><div className="mini-row"><b>Batting</b><span /></div>{match.batters.map((player) => <div className="mini-row" key={player.name}><span>{player.name}</span><span className="r">{player.runs}{player.notOut ? '*' : ''}{player.balls != null ? ` (${player.balls})` : ''}</span></div>)}</div>}
          {match.bowlers?.length > 0 && <div className="player-lines"><div className="mini-row"><b>Bowling</b><span /></div>{match.bowlers.map((player) => <div className="mini-row" key={player.name}><span>{player.name}</span><span className="r">{player.wickets}/{player.runs}{player.overs != null ? ` (${player.overs})` : ''}</span></div>)}</div>}
          {!hasPlayers && <p className="live-detail-note">Player-by-player figures appear when the verified feed supplies them.</p>}
        </div>
      )}
    </div>
  );
}

function checkedAgo(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Recently checked';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  return seconds < 90 ? `Checked ${seconds}s ago` : `Checked ${Math.floor(seconds / 60)}m ago`;
}

export default function LiveSection({ matches, state, loading, onSeeAll, onOpenMatch }) {
  const [selectedId, setSelectedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const match = matches.find((item) => item.id === selectedId) ?? matches[0];
  const index = Math.max(0, matches.findIndex((item) => item.id === match?.id));
  const select = (next) => {
    setSelectedId(matches[next].id);
    setExpandedId(null);
  };

  return (
    <section className="live-section" aria-labelledby="live-title">
      <SectionHead
        title={<span id="live-title">Live right now</span>}
        leading={match ? <span className="pulse" /> : null}
        className="live-heading"
      >
        {matches.length > 1 ? (
          <div className="story-nav">
            <button type="button" aria-label="Previous live match" disabled={index === 0} onClick={() => select(index - 1)}><I.Chevron size={16} style={{ transform: 'rotate(180deg)' }} /></button>
            <button type="button" aria-label="Next live match" disabled={index === matches.length - 1} onClick={() => select(index + 1)}><I.Chevron size={16} /></button>
          </div>
        ) : <button type="button" className="seclink" onClick={onSeeAll}>All matches →</button>}
      </SectionHead>

      {!match ? (
        <div className="live-empty" role="status">
          <I.CricketBall size={19} />
          <span><strong>{loading ? 'Checking live scores' : state === 'none' ? 'No tracked matches are live' : 'Live scores are unavailable'}</strong><small>{loading ? 'Connecting to the verified score feed.' : state === 'none' ? 'Upcoming fixtures are listed below.' : 'Scores return after a fresh, independent source check.'}</small></span>
        </div>
      ) : (
        <>
          <article className={`livecard${expandedId === match.id ? ' open' : ''}`}>
            <button
              type="button"
              className="livecard-top"
              aria-expanded={expandedId === match.id}
              aria-controls={`live-expand-${match.id}`}
              onClick={() => setExpandedId(expandedId === match.id ? null : match.id)}
            >
              <span className="live-meta">{match.series}{match.venue ? ` · ${match.venue}` : ''}</span>
              <I.Chevron size={17} className="exp-chev" />
            </button>
            <button type="button" className="livecard-score" onClick={() => onOpenMatch(match)} aria-label={`Open live match: ${match.batting.name} v ${match.bowling.name}`}>
              <LiveScoreboard key={match.id} match={match} />
            </button>
            <div className="live-expand" id={`live-expand-${match.id}`}>
              <LiveScoreboard match={match} detail />
            </div>
          </article>
          <div className="live-source-row">
            {match.verifiedAt && <span>{checkedAgo(match.verifiedAt)}</span>}
            <button type="button" className="seclink" onClick={() => onOpenMatch(match)}>Scorecard →</button>
          </div>
        </>
      )}
    </section>
  );
}
