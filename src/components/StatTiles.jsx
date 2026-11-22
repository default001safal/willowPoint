// Stat tiles: a big mono figure with a small unit, a caps label and a one-line badge.
// One tile per section can be "inverse" (white) to carry the headline.
import * as I from './Icons.jsx';

export function StatTile({ value, unit, label, badge, tone = 'go', inverse = false, title }) {
  return (
    <div className={`tile${inverse ? ' inverse' : ''}`} title={title}>
      <p className="tile-value">
        {value}
        {unit && <sup>{unit}</sup>}
      </p>
      <p className="tile-label">{label}</p>
      {badge && (
        <p className={`tile-badge ${tone}`}>
          <span className="tile-badge-dot" aria-hidden="true">
            <I.ArrowUp size={10} sw={3} style={{ transform: tone === 'stop' ? 'rotate(135deg)' : 'rotate(45deg)' }} />
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
