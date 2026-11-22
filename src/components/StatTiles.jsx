// Stat tiles: a big mono figure with a small unit, a caps label and one badge line.
// Badges are neutral facts (grey dot) unless there's a direction worth flagging:
// "up" (green arrow) is good for the side we follow, "down" (red arrow) is not.
// One tile per section is "inverse" (white): the thing to read first.
import * as I from './Icons.jsx';

export function StatTile({ value, unit, label, mark, badge, trend = 'neutral', inverse = false, title }) {
  return (
    <div className={`tile${inverse ? ' inverse' : ''}`} title={title}>
      <p className="tile-value">
        {value}
        {unit && <sup>{unit}</sup>}
      </p>
      <p className="tile-label">{mark}{label}</p>
      {badge && (
        <p className={`tile-badge ${trend}`}>
          <span className="tile-badge-dot" aria-hidden="true">
            {trend === 'neutral' ? <span className="tile-pip" /> : (
              <I.ArrowUp size={10} sw={3} style={trend === 'down' ? { transform: 'rotate(180deg)' } : undefined} />
            )}
          </span>
          {badge}
        </p>
      )}
    </div>
  );
}

export const TileGrid = ({ children, label }) => (
  <div className="tile-grid" role="group" aria-label={label}>{children}</div>
);

// Two team tiles facing each other, with a "VS" disc sitting across the gap.
// The side that's batting is set in full white; the other is muted.
export function MatchupTiles({ sides }) {
  return (
    <div className="matchup">
      {sides.map((s, i) => (
        <div key={s.name} className={`tile${i ? ' right' : ''}${s.active ? ' active' : ' idle'}`}>
          <p className="tile-value">
            {s.runs}
            <sup>/{s.wickets}</sup>
          </p>
          <p className="tile-label">{s.mark}{s.name}</p>
          <p className="tile-badge neutral">
            <span className="tile-badge-dot" aria-hidden="true"><span className="tile-pip" /></span>
            {s.overs} overs
          </p>
        </div>
      ))}
      <span className="vs" aria-hidden="true">VS</span>
    </div>
  );
}
