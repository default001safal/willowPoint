import * as I from './Icons.jsx';
import { SaveButton, parts, relativeDay } from './ui.jsx';
import { MarkPair } from './TeamMark.jsx';

export default function FixtureRow({ fixture, today, saved, toggleSaved, onOpenRecord, awaiting = false }) {
  const date = parts(fixture.date);
  return (
    <div className="fixture-row">
      <button type="button" className="record-row-main" onClick={() => onOpenRecord({ type: 'fixture', id: fixture.id })}>
        <span className="fixture-date"><b>{String(date.date).padStart(2, '0')}</b><small>{date.month}</small></span>
        <span className="row-text">
          <strong className="with-marks"><MarkPair title={fixture.title} size={15} />{fixture.title}</strong>
          <span>{awaiting ? `Status awaiting confirmation · ${fixture.venue}` : `${relativeDay(fixture.date, today)} · ${fixture.time || 'Time TBC'} · ${fixture.venue}`}</span>
        </span>
        <I.Chevron size={15} />
      </button>
      <SaveButton label={fixture.title} saved={saved.includes(fixture.id)} onToggle={() => toggleSaved(fixture.id)} />
    </div>
  );
}
