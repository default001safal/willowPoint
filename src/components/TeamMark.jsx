// Team marks: national flags (public/flags, unframed, natural shape) and team logos.
// Official franchise logos can be set without a code change: add the image URL to
// Firestore config/teamLogos as { "<Team name>": "https://…" }. Until then NPL teams show a
// neutral monogram crest (public/crests).
import { useContent } from '../lib/content.jsx';

const FLAGS = {
  nepal: 'nepal',
  'nepal women': 'nepal',
  uae: 'uae',
  pakistan: 'pakistan',
  'pakistan a': 'pakistan',
  india: 'india',
  'india a': 'india',
  italy: 'italy',
  england: 'england',
  'new zealand': 'new-zealand',
  australia: 'australia',
};

const CRESTS = {
  'lumbini lions': 'lumbini-lions',
  'sudurpaschim royals': 'sudurpaschim-royals',
  'chitwan rhinos': 'chitwan-rhinos',
};

const key = (name = '') => name.trim().toLowerCase();

export function useMark(name) {
  const { teamLogos = {} } = useContent();
  const k = key(name);
  const logo = Object.entries(teamLogos).find(([n]) => key(n) === k)?.[1];
  if (logo) return { src: logo, kind: 'logo' };
  if (FLAGS[k]) return { src: `/flags/${FLAGS[k]}.svg`, kind: 'flag' };
  if (CRESTS[k]) return { src: `/crests/${CRESTS[k]}.svg`, kind: 'crest' };
  return null;
}

// `size` is the height; flags keep their own shape, logos and crests are square.
// Decorative: the team name is always shown next to it.
// `slot` reserves a flag-wide box so team names in a list line up, whatever the mark's shape.
export function TeamMark({ name, size = 24, fallback, className = '', slot = false }) {
  const mark = useMark(name);
  if (!mark) return slot ? <span className="mark-slot" style={{ width: Math.round(size * 1.5), height: size }} /> : fallback ?? null;
  // Flags keep their natural proportions (Nepal's pennant is narrower than the rest).
  const style = mark.kind === 'flag' ? { height: size, width: 'auto' } : { height: size, width: size };
  const img = <img className={`team-mark ${mark.kind} ${className}`} src={mark.src} alt="" style={style} decoding="async" />;
  return slot ? <span className="mark-slot" style={{ width: Math.round(size * 1.5), height: size }}>{img}</span> : img;
}

// Marks for both sides of an "A v B" title.
export function MarkPair({ title, size = 14 }) {
  const [a, b] = title.split(/\s+v\s+/i);
  return (
    <span className="mark-pair" aria-hidden="true">
      <TeamMark name={a} size={size} />
      <TeamMark name={b} size={size} />
    </span>
  );
}
