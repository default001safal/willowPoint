import { useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead } from './ui.jsx';
import { DotLegend, ViewSwitch } from './StatCard.jsx';
import { overMarkers } from '../lib/innings.js';
import { bestOverIndex, cumulative, overTone } from '../lib/statcard.js';
import { mockOverRuns } from '../data.js';

const VIEWS = [
  { id: 'worm', label: 'Run race', icon: <I.ChartWorm size={18} /> },
  { id: 'bars', label: 'Runs per over, bars', icon: <I.ChartBars size={18} /> },
  { id: 'grid', label: 'Runs per over, grid', icon: <I.ChartGrid size={18} /> },
];

const pad = (n) => String(n).padStart(2, '0');

function OverGrid({ markers, best }) {
  return (
    <ol className="over-dots" aria-label="Runs per over">
      {markers.map((m, i) => {
        const upcoming = m.state === 'upcoming';
        const tone = i === best ? 'best' : overTone(m.runs);
        return (
          <li
            key={m.over}
            className={`${upcoming ? 'upcoming' : tone}${m.state === 'current' ? ' current' : ''}`}
            title={upcoming ? `Over ${m.over}: to come` : `Over ${m.over}: ${m.runs ?? '—'} runs${m.state === 'current' ? ' so far' : ''}`}
          >
            {upcoming ? <span className="pip" aria-hidden="true" /> : m.runs == null ? '—' : pad(m.runs)}
          </li>
        );
      })}
    </ol>
  );
}

function OverBars({ markers, best }) {
  const peak = Math.max(12, ...markers.map((m) => m.runs ?? 0));
  return (
    <ol className="over-bars" aria-label="Runs per over">
      {markers.map((m, i) => {
        const upcoming = m.state === 'upcoming';
        const tone = i === best ? 'best' : overTone(m.runs);
        return (
          <li
            key={m.over}
            className={`${upcoming ? 'upcoming' : tone}${m.state === 'current' ? ' current' : ''}`}
            style={{ '--h': upcoming || m.runs == null ? 0 : Math.max(0.08, m.runs / peak) }}
            title={upcoming ? `Over ${m.over}: to come` : `Over ${m.over}: ${m.runs ?? '—'} runs`}
          />
        );
      })}
    </ol>
  );
}

// Run race: running totals over by over for both sides.
function Worm({ sides, maxOvers, target }) {
  const W = 300;
  const H = 66;
  const top = Math.max(target ?? 0, ...sides.flatMap((s) => s.totals), 1);
  const x = (o) => (o / maxOvers) * W;
  const y = (r) => H - (r / top) * (H - 4) - 2;
  return (
    <svg className="worm" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label={sides.map((s) => `${s.name} ${s.totals.at(-1) ?? 0} after ${s.totals.length} overs`).join(', ')}>
      {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={y(top * f)} y2={y(top * f)} className="worm-rule" />)}
      {sides.map((s) => (
        <polyline key={s.name} className={`worm-line ${s.tone}`} fill="none"
          points={[[0, 0], ...s.totals.map((t, i) => [i + 1, t])].map(([o, r]) => `${x(o)},${y(r)}`).join(' ')} />
      ))}
    </svg>
  );
}

function LiveStats({ match }) {
  const [view, setView] = useState('grid');
  const [side, setSide] = useState('batting');
  const maxOvers = match.maxOvers ?? 20;
  const runsFor = (s) => match[s].overRuns ?? mockOverRuns[match.id]?.[s];
  const shown = match[side];
  const markers = overMarkers({ ...shown, overRuns: runsFor(side) }, maxOvers, side === 'batting');
  const best = bestOverIndex(markers);
  const bat = overMarkers({ ...match.batting, overRuns: runsFor('batting') }, maxOvers, true);
  const current = bat.find((m) => m.state === 'current');
  const oversIn = current?.over ?? bat.filter((m) => m.state === 'completed').length;

  const crr = Number(match.runRate);
  const rrr = Number(match.requiredRate);
  const delta = Number.isFinite(crr) && Number.isFinite(rrr) ? crr - rrr : null;
  const need = match.target != null ? match.target - match.batting.runs : null;

  const pickSide = (s) => () => setSide(s);
  const legend = [
    { label: match.batting.name, tone: 'green', pressed: view !== 'worm' && side === 'batting', onClick: view === 'worm' ? undefined : pickSide('batting') },
    { label: match.bowling.name, tone: 'red', pressed: view !== 'worm' && side === 'bowling', onClick: view === 'worm' ? undefined : pickSide('bowling') },
  ];

  return (
    <article className="stat-card" aria-label={`${match.batting.name} v ${match.bowling.name}`}>
      <div className="stat-top">
        <div className="stat-lead">
          <span className="stat-hero" title="Current run rate">{match.runRate ?? '—'}</span>
          {delta != null && (
            <span className={`stat-delta${delta < 0 ? ' down' : ''}`} title={`Required rate is ${match.requiredRate}`}>
              <I.Trend size={16} style={delta < 0 ? { transform: 'scaleY(-1)' } : undefined} />
              {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(2)}
            </span>
          )}
        </div>
        <ViewSwitch label="Chart" views={VIEWS} value={view} onChange={setView} />
      </div>

      <div className="stat-meta">
        <DotLegend items={legend} />
        <span className="stat-note"><abbr title="Current run rate">CRR</abbr> · {oversIn}/{maxOvers} ov</span>
      </div>

      <div className="stat-chart">
        {view === 'grid' && <OverGrid markers={markers} best={best} />}
        {view === 'bars' && <OverBars markers={markers} best={best} />}
        {view === 'worm' && (
          <Worm
            maxOvers={maxOvers}
            target={match.target}
            sides={[
              { name: match.bowling.name, tone: 'red', totals: cumulative(runsFor('bowling')) },
              { name: match.batting.name, tone: 'green', totals: cumulative(runsFor('batting')) },
            ]}
          />
        )}
      </div>

      <p className="stat-foot">
        <span><b>{match.batting.name} {match.batting.runs}/{match.batting.wickets}</b> v {match.bowling.name} {match.bowling.runs}/{match.bowling.wickets}</span>
        {need != null && need > 0 && match.ballsLeft != null && <span>need <b className="go">{need} off {match.ballsLeft}</b></span>}
      </p>
    </article>
  );
}

export default function LiveSection({ matches, onAskCue }) {
  const [selectedId, setSelectedId] = useState(null);
  const match = matches.find((item) => item.id === selectedId) ?? matches[0];
  if (!match) return null;

  return (
    <section className="section live-section" aria-labelledby="live-title">
      <SectionHead title={<span id="live-title">Live now</span>} leading={<span className="live-dot" />}>
        <div className="live-actions">
          {matches.length > 1 && (
            <div className="pager" role="group" aria-label="Live matches">
              {matches.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={item.id === match.id} aria-label={`${item.batting.name} v ${item.bowling.name}`} onClick={() => setSelectedId(item.id)}>
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="innings-cue" onClick={() => onAskCue(`Talk me through ${match.batting.name} v ${match.bowling.name}`)}>
            <I.SparkGlint size={14} /><span><b>Ask</b> Cue</span>
          </button>
        </div>
      </SectionHead>
      <LiveStats key={match.id} match={match} />
    </section>
  );
}
