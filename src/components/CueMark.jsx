export default function CueMark({ size = 34, state = 'idle', animated = false, className = '' }) {
  return (
    <svg
      className={`cue-mark cue-symbol${animated ? ' is-animated' : ''}${className ? ` ${className}` : ''}`}
      data-state={state}
      width={size}
      height={size}
      viewBox="0 0 210 210"
      role="img"
      aria-label="Cue"
    >
      <circle cx="105" cy="124" r="67.75" fill="none" stroke="currentColor" strokeWidth="4.5" />
      <circle cx="89" cy="101.5" r="5" fill="currentColor" />
      <circle cx="121" cy="101.5" r="5" fill="currentColor" />
      <g className="cue-stump cue-stump-left">
        <rect x="85.75" y="17" width="13" height="29" rx="6.5" fill="currentColor" />
      </g>
      <g className="cue-stump cue-stump-right">
        <rect x="111.25" y="17" width="13" height="29" rx="6.5" fill="currentColor" />
      </g>
    </svg>
  );
}
