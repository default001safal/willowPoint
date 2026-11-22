// Stroke icons, inherit currentColor. Decorative by default (aria-hidden).

function Svg({ size = 20, sw = 1.8, children, ...rest }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Bell = (p) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Svg>
);

export const Search = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const Spark = (p) => (
  <Svg sw={2} {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  </Svg>
);

export const SparkGlint = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 3v4M17 5h4" />
  </Svg>
);

export const SparkPlus = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 16v4M17 18h4" />
  </Svg>
);

export const Calendar = (p) => (
  <Svg sw={2} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const Trophy = (p) => (
  <Svg sw={2} {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </Svg>
);

export const Bookmark = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </Svg>
);

export const Pin = (p) => (
  <Svg sw={2} {...p}>
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const Swap = (p) => (
  <Svg sw={2} {...p}>
    <path d="M17 3l4 4-4 4" />
    <path d="M3 7h18" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M21 17H3" />
  </Svg>
);

export const Target = (p) => (
  <Svg sw={2.2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const Trend = (p) => (
  <Svg sw={2.2} {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);

export const Gauge = (p) => (
  <Svg sw={2.2} {...p}>
    <path d="M4 15a8 8 0 1 1 16 0" />
    <path d="M12 15l4-5" />
  </Svg>
);

export const Grid = (p) => (
  <Svg sw={2} {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Svg>
);

export const Globe = (p) => (
  <Svg sw={2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);

export const Female = (p) => (
  <Svg sw={2} {...p}>
    <circle cx="12" cy="7" r="3.5" />
    <path d="M12 10.5v10M8.5 16h7" />
  </Svg>
);

export const Chevron = (p) => (
  <Svg sw={2.2} {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const ArrowUp = (p) => (
  <Svg sw={2} {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);

export const Home = (p) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Svg>
);

export const Compass = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </Svg>
);

export const CricketBat = (p) => (
  <Svg {...p}>
    <g transform="rotate(35 12 12)">
      <path d="M12 3v6" strokeWidth="2.4" />
      <rect x="9" y="8" width="6" height="13" rx="1.5" fill="currentColor" stroke="none" />
    </g>
  </Svg>
);

export const CricketBall = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" fill="currentColor" stroke="none" />
    <path d="M8 4.5c5 4 3 11 8 15" stroke="var(--surface)" strokeWidth="1.4" />
    <path d="M10.5 4c5 4 3 11 8 15" stroke="var(--surface)" strokeWidth="1" strokeDasharray="1 2" />
  </Svg>
);

export const Plus = (p) => (
  <Svg sw={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Check = (p) => (
  <Svg sw={2.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

// View-switch glyphs for the stat cards.
export const ChartWorm = (p) => (
  <Svg sw={1.8} {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-6" />
    <circle cx="7" cy="15" r="1.6" />
    <circle cx="11" cy="10" r="1.6" />
    <circle cx="19" cy="7" r="1.6" />
  </Svg>
);
export const ChartBars = (p) => (
  <Svg sw={1.8} {...p}>
    <rect x="4" y="14" width="3.5" height="6" rx="1" />
    <rect x="10.25" y="12" width="3.5" height="8" rx="1" />
    <rect x="16.5" y="10" width="3.5" height="10" rx="1" />
    <path d="M4 9l6-3 5 1 5-3M17 4h3v3" />
  </Svg>
);
export const ChartGrid = (p) => (
  <Svg sw={2} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
    <path d="M3.5 9.2h17M3.5 14.8h17M9.2 3.5v17M14.8 3.5v17" />
  </Svg>
);
export const ViewList = (p) => (
  <Svg sw={1.9} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1.1" fill="currentColor" />
  </Svg>
);
export const ViewStrip = (p) => (
  <Svg sw={0} fill="currentColor" {...p}>
    {[9, 15].flatMap((y) => [4, 9.3, 14.7, 20].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" />))}
  </Svg>
);
export const ViewMonth = (p) => (
  <Svg sw={1.9} {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <path d="M3 9.5h18M3 15.2h18M9 9.5V21M15 9.5V21" />
  </Svg>
);
