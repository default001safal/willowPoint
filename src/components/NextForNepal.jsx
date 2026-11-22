// "Next for Nepal" as a stat card: List (default), Two weeks, Month.
import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import { SectionHead, addDays, parts } from './ui.jsx';
import { DotLegend, ViewSwitch } from './StatCard.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { clockTime, countdownLabel, kickoffUTC } from '../lib/statcard.js';

const VIEWS = [
  { id: 'list', label: 'List', icon: <I.ViewList size={18} /> },
  { id: 'strip', label: 'Two weeks', icon: <I.ViewStrip size={18} /> },
  { id: 'month', label: 'Month', icon: <I.ViewMonth size={18} /> },
];

const pad = (n) => String(n).padStart(2, '0');
const involvesNepal = (name = '') => /^nepal\b/i.test(name.trim());

// Everything the three views need, in one place.
function useSchedule() {
  const { today, fixtures, liveMatches, results } = useContent();
  const live = liveMatches
    .filter((m) => involvesNepal(m.batting.name) || involvesNepal(m.bowling.name))
    .map((m) => ({
      id: m.id, date: today, kind: 'live',
      title: `${m.batting.name} v ${m.bowling.name}`,
      meta: `Today · ${m.venue}`,
      detail: m.target != null && m.ballsLeft != null
        ? `Live · ${m.batting.name} need ${m.target - m.batting.runs} off ${m.ballsLeft}`
        : 'Live now',
      time: 'LIVE',
    }));
  const upcoming = fixtures
    .filter((f) => f.nepal !== false && f.date >= today && !isLiveFixture(f, liveMatches, today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((f, i) => {
      const p = parts(f.date);
      const when = f.date === today ? 'Today' : f.date === addDays(today, 1) ? 'Tomorrow' : p.day;
      return {
        id: f.id, date: f.date, kind: i === 0 ? 'next' : 'later', title: f.title,
        meta: `${i === 0 ? when : `${p.day} ${p.date} ${p.month}`} · ${f.venue}`,
        detail: `${p.day} ${p.date} ${p.month} · ${f.time} · ${f.venue}`,
        time: clockTime(f.time) ?? 'TBC', raw: f,
      };
    });
  const played = results
    .filter((r) => r.competition === 'Nepal' && r.date && r.date < today)
    .map((r) => ({ id: r.id, date: r.date, kind: 'played', title: r.lines.map((l) => l.team).join(' v '), detail: r.summary }));
  return { today, rows: [...live, ...upcoming], next: upcoming[0], played };
}

function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function DateDot({ game, label, size = 'md', selected, onPick }) {
  const tone = game ? (game.kind === 'next' ? 'next' : 'game') : label ? 'plain' : 'empty';
  const cls = `date-dot ${tone} ${size}${selected ? ' selected' : ''}`;
  const text = label ?? (game ? pad(parts(game.date).date) : null);
  if (onPick && game) {
    return (
      <button type="button" className={cls} aria-pressed={selected} aria-label={`${game.title}, ${game.detail}`} onClick={onPick}>
        {text}
      </button>
    );
  }
  return <span className={cls} aria-hidden={!text}>{text ?? <span className="pip" />}</span>;
}

function ListView({ rows: all }) {
  // Today's live game already has the Live now card right above.
  const rows = all.filter((g) => g.kind !== 'live');
  if (!rows.length) return <p className="stat-empty">No Nepal matches scheduled yet.</p>;
  return (
    <ul className="game-list">
      {rows.slice(0, 3).map((g) => (
        <li key={g.id}>
          <DateDot game={g} size="lg" />
          <span className="game-text">
            <strong>{g.title}</strong>
            <span>{g.meta}</span>
          </span>
          <span className={`game-time ${g.kind}`}>{g.time}</span>
        </li>
      ))}
    </ul>
  );
}

function PickedFoot({ game }) {
  if (!game) return null;
  return (
    <div className="picked">
      <strong>{game.title}</strong>
      <span>{game.detail}</span>
    </div>
  );
}

function StripView({ today, rows, picked, onPick }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const byDate = Object.fromEntries(rows.map((g) => [g.date, g]));
  const first = parts(days[0]);
  const last = parts(days[13]);
  return (
    <>
      <ol className="date-grid" aria-label="Next two weeks">
        {days.map((d) => {
          const g = byDate[d];
          return <li key={d}><DateDot game={g} selected={g && picked?.id === g.id} onPick={() => onPick(g)} /></li>;
        })}
      </ol>
      <div className="date-range" aria-hidden="true"><span>{first.date} {first.month}</span><span>{last.date} {last.month}</span></div>
      <PickedFoot game={picked} />
    </>
  );
}

function MonthView({ today, rows, played, picked, onPick }) {
  const [y, m] = today.split('-').map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const length = new Date(y, m, 0).getDate();
  const byDate = Object.fromEntries([...played, ...rows].map((g) => [g.date, g]));
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`),
  ];
  return (
    <>
      <div className="weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <ol className="date-grid month" aria-label="This month">
        {cells.map((d, i) => {
          if (!d) return <li key={`b${i}`} aria-hidden="true" />;
          const g = byDate[d];
          if (g) return <li key={d}><DateDot game={g} selected={picked?.id === g.id} onPick={() => onPick(g)} /></li>;
          return <li key={d}><span className={`date-dot ${d < today ? 'past' : 'plain'} md`}>{pad(Number(d.slice(8)))}</span></li>;
        })}
      </ol>
      <PickedFoot game={picked} />
    </>
  );
}

export default function NextForNepal({ onSeeAll }) {
  const { today, rows, next, played } = useSchedule();
  const now = useNow();
  const [view, setView] = useState('list');
  const [pickedId, setPickedId] = useState(null);
  const picked = [...rows, ...played].find((g) => g.id === pickedId) ?? next ?? rows[0];

  const nextParts = next ? parts(next.date) : null;
  const countdown = next ? countdownLabel(kickoffUTC(next.date, next.raw.time) - now) : null;

  // One headline for every view: how long until Nepal's next game.
  const opponent = next ? next.title.replace(/\s+v\s+Nepal$|^Nepal\s+v\s+/i, '') : null;
  const hero = countdown ?? (nextParts ? `${nextParts.day} ${nextParts.date}` : '—');
  const delta = next ? `to ${opponent}${countdown ? '' : ` · ${nextParts.day} ${nextParts.date}`}` : null;

  const monthGames = [...played, ...rows].filter((g) => g.date.slice(0, 7) === today.slice(0, 7)).length;
  const legend = view === 'list' ? null : [{ label: 'Next', tone: 'green' }, { label: 'Games', tone: 'outline' }];
  const note = {
    list: `${pad(Math.min(rows.filter((g) => g.kind !== 'live').length, 3))} games`,
    strip: '14 days',
    month: `${parts(today).month.toUpperCase()} · ${pad(monthGames)} games`,
  }[view];

  return (
    <section className="section" aria-label="Nepal's next matches">
      <SectionHead title="Next for Nepal">
        <button type="button" className="section-link" onClick={onSeeAll}>
          All fixtures <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </SectionHead>
      <article className="stat-card">
        <div className="stat-top">
          <div className="stat-lead stacked">
            <span className="stat-hero">{hero}</span>
            {delta && <span className="stat-delta">{delta}</span>}
          </div>
          <ViewSwitch label="Fixture view" views={VIEWS} value={view} onChange={setView} />
        </div>
        {legend && (
          <div className="stat-meta">
            <DotLegend items={legend} />
            <span className="stat-note">{note}</span>
          </div>
        )}
        <div className="stat-chart">
          {view === 'list' && <ListView rows={rows} />}
          {view === 'strip' && <StripView today={today} rows={rows} picked={picked} onPick={(g) => setPickedId(g.id)} />}
          {view === 'month' && <MonthView today={today} rows={rows} played={played} picked={picked} onPick={(g) => setPickedId(g.id)} />}
        </div>
      </article>
    </section>
  );
}
