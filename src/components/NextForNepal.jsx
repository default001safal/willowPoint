// "Next for Nepal": the week strip (today + 6 days, dots on match days) and, under it,
// the same fixture rows as Discover's Upcoming list for the picked day (or "All").
import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';
import { SaveButton, SectionHead, addDays, parts, relativeDay } from './ui.jsx';
import { MarkPair, TeamMark } from './TeamMark.jsx';
import { useContent } from '../lib/content.jsx';
import { isLiveFixture } from '../lib/fixtures.js';
import { clockTime, countdownLabel, kickoffUTC } from '../lib/statcard.js';

function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const opponentOf = (title) => title.replace(/\s+v\s+Nepal$|^Nepal\s+v\s+/i, '');

// The picked day's game as two tiles: who (flags + opponent + venue) and when
// (countdown, kick-off, and a dot per day from today to match day).
function MatchTiles({ fixture: f, today, now, saved, onSave }) {
  const opp = opponentOf(f.title);
  const p = parts(f.date);
  const clock = clockTime(f.time);
  const countdown = countdownLabel(kickoffUTC(f.date, f.time) - now);
  const days = Math.max(0, Math.round((new Date(`${f.date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86_400_000));
  const steps = Math.min(days, 6);
  return (
    <div className="match-tiles">
      <div className="mt-who">
        <span className="mt-flags" aria-hidden="true">
          <span><TeamMark name={opp} size={18} /></span>
          <i>v</i>
          <span><TeamMark name="Nepal" size={18} /></span>
        </span>
        <strong>{opp}</strong>
        <span className="mt-sub"><I.Pin size={12} />{f.venue}</span>
      </div>
      <div className="mt-when">
        <div className="mt-when-top">
          <div>
            <strong>{countdown ? `In ${countdown}` : `${p.day} ${p.date} ${p.month}`}</strong>
            <span>{p.day} {p.date} {p.month}{clock ? `, ${clock} NPT` : ', time TBC'}</span>
          </div>
          <SaveButton label={f.title} saved={saved} onToggle={onSave} />
        </div>
        <span className="mt-steps" aria-hidden="true">
          {Array.from({ length: steps }, (_, i) => <span key={i} className={i === 0 ? 'on' : undefined} />)}
          <span className="match"><I.Check size={12} sw={3} /></span>
        </span>
      </div>
    </div>
  );
}

export default function NextForNepal({ onSeeAll, saved = [], toggleSaved = () => {} }) {
  const { today, fixtures: all, liveMatches } = useContent();
  const now = useNow();
  // Today's live game has its own section above; a game whose start has passed isn't "next".
  const fixtures = all
    .filter((f) => f.nepal !== false && f.date >= today && !isLiveFixture(f, liveMatches, today))
    .filter((f) => (kickoffUTC(f.date, f.time) ?? Infinity) > now)
    .sort((a, b) => a.date.localeCompare(b.date));

  const [day, setDay] = useState(null);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const hasMatch = new Set(fixtures.map((f) => f.date));
  const selected = day === 'all' || week.includes(day)
    ? day
    : fixtures.find((f) => week.includes(f.date))?.date ?? week[0];
  const shown = (selected === 'all' ? fixtures : fixtures.filter((f) => f.date === selected)).slice(0, 3);
  const first = parts(week[0]);
  const last = parts(week[6]);
  const y1 = week[0].slice(0, 4);
  const y2 = week[6].slice(0, 4);
  const monthLabel = y1 !== y2
    ? `${first.month} ${y1} – ${last.month} ${y2}`
    : `${first.month}${first.month !== last.month ? ` – ${last.month}` : ''} ${y1}`;

  return (
    <section className="section fixtures-bare" aria-label="Nepal's next matches">
      <SectionHead title="Next for Nepal">
        <button type="button" className="section-link" onClick={onSeeAll}>
          All fixtures <I.ArrowUp size={11} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </SectionHead>
      <div className="fixture-month">
        <span>{monthLabel}</span>
        <button type="button" aria-label="Show all upcoming Nepal matches" aria-pressed={selected === 'all'} onClick={() => setDay('all')}>All</button>
      </div>
      <div className="fixture-week" role="group" aria-label="Choose fixture date">
        {week.map((d) => {
          const p = parts(d);
          return (
            <button key={d} type="button" aria-pressed={selected === d} aria-label={`${d === today ? 'Today, ' : ''}${p.day} ${p.date} ${p.month}`} onClick={() => setDay(d)}>
              <span aria-hidden="true" className={`fixture-match-dot${hasMatch.has(d) ? ' has-match' : ''}`} />
              <small className={d === today ? 'is-today' : undefined}>{d === today ? 'Today' : p.day}</small>
              <b>{p.date}</b>
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="fixture-list">
        {shown.length === 0 && <p className="fixture-empty">No Nepal matches on this date.</p>}
        {selected !== 'all' && shown.length > 0 && (
          <MatchTiles fixture={shown[0]} today={today} now={now} saved={saved.includes(shown[0].id)} onSave={() => toggleSaved(shown[0].id)} />
        )}
        {selected === 'all' && shown.length > 0 && (
          <div className="card">
            {shown.map((f, i) => {
              const p = parts(f.date);
              return (
                <div className={`list-row${i ? ' row-top' : ''}`} key={f.id}>
                  <div className="date-block"><b>{p.date}</b><small>{p.month}</small></div>
                  <div className="row-text">
                    <strong className="with-marks"><MarkPair title={f.title} size={14} />{f.title}</strong>
                    <span>{relativeDay(f.date, today)} · {f.time} · {f.venue}</span>
                  </div>
                  <SaveButton label={f.title} saved={saved.includes(f.id)} onToggle={() => toggleSaved(f.id)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
