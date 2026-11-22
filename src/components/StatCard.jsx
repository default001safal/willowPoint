// Shared pieces of the stat-style cards: the pill view switcher and the dot legend.

export function ViewSwitch({ label, views, value, onChange }) {
  return (
    <div className="view-switch" role="radiogroup" aria-label={label}>
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={value === v.id}
          aria-label={v.label}
          title={v.label}
          onClick={() => onChange(v.id)}
        >
          {v.icon}
        </button>
      ))}
    </div>
  );
}

// items: [{ label, tone: 'white' | 'green' | 'outline' | 'red', pressed?, onClick? }]
export function DotLegend({ items }) {
  return (
    <div className="dot-legend">
      {items.map((it, i) => {
        const body = (
          <>
            <span className={`legend-dot ${it.tone}`} aria-hidden="true" />
            {it.label}
          </>
        );
        return (
          <span key={it.label} className="legend-item">
            {i > 0 && <span className="legend-sep" aria-hidden="true">·</span>}
            {it.onClick ? (
              <button type="button" aria-pressed={it.pressed} onClick={it.onClick}>{body}</button>
            ) : (
              <span className="legend-static">{body}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
