import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';

function Team({ team, batting }) {
  return (
    <div className={`team${batting ? ' batting' : ''}`}>
      <div className="team-name">
        <span className="badge" style={{ background: team.color }}>{team.code}</span>
        <span>{team.name}</span>
      </div>
      <div className="score">
        <b style={batting ? undefined : { color: 'var(--text-2)' }}>{team.runs}</b>
        <span>/{team.wickets}</span>
      </div>
      <div className="row-between">
        <span className="overs">{team.overs} overs</span>
        {batting && <span className="tag">BATTING</span>}
      </div>
    </div>
  );
}

export default function LiveSection({ matches, onAskCue }) {
  const [index, setIndex] = useState(0);
  if (!matches.length) return null;
  const m = matches[Math.min(index, matches.length - 1)];

  return (
    <section className="section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">Live now</span>} leading={<span className="live-dot" />}>
        <div className="pager" role="tablist" aria-label="Live matches">
          {matches.map((match, i) => (
            <button
              key={match.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${match.batting.name} v ${match.bowling.name}`}
              onClick={() => setIndex(i)}
            >
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      </SectionHead>

      <article className="card live-card">
        <div className="row-between">
          <button
            type="button"
            className="ask"
            aria-label="Ask Cue about this match"
            title="Ask Cue"
            onClick={() => onAskCue(`Talk me through ${m.batting.name} v ${m.bowling.name}`)}
          >
            <I.SparkGlint size={20} />
          </button>
          <div className="card-title">
            <span className="series">{m.series}</span>
            <span className="sep" aria-hidden="true">·</span>
            <span className="venue">{m.venue}</span>
          </div>
        </div>

        <div className="teams">
          <Team team={m.batting} batting />
          <Team team={m.bowling} />
        </div>
      </article>

      <div className="stat-ribbon" aria-label="Match stats">
        <div><small><I.Target size={12} />Target</small><b>{m.target}</b></div>
        <div><small><I.Trend size={12} />Run rate</small><b>{m.runRate}</b></div>
        <div><small><I.Gauge size={12} />Req. rate</small><b className="good">{m.requiredRate}</b></div>
      </div>
    </section>
  );
}
