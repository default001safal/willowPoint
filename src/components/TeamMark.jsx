// Flags for national sides, monogram crests for NPL franchises (placeholders until
// official logos are licensed). Files live in public/flags and public/crests.

const MARKS = {
  nepal: '/flags/nepal.svg',
  'nepal women': '/flags/nepal.svg',
  uae: '/flags/uae.svg',
  pakistan: '/flags/pakistan.svg',
  'pakistan a': '/flags/pakistan.svg',
  india: '/flags/india.svg',
  'india a': '/flags/india.svg',
  italy: '/flags/italy.svg',
  england: '/flags/england.svg',
  'new zealand': '/flags/new-zealand.svg',
  australia: '/flags/australia.svg',
  'lumbini lions': '/crests/lumbini-lions.svg',
  'sudurpaschim royals': '/crests/sudurpaschim-royals.svg',
  'chitwan rhinos': '/crests/chitwan-rhinos.svg',
};

export const markFor = (name = '') => MARKS[name.trim().toLowerCase()] || null;

// Decorative: the team name is always shown next to it.
export function TeamMark({ name, size = 24, fallback, className = '' }) {
  const src = markFor(name);
  if (!src) return fallback ?? null;
  return <img className={`team-mark ${className}`} src={src} alt="" width={size} height={size} loading="lazy" />;
}

// Two overlapping marks for "A v B" fixture titles.
export function MarkPair({ title, size = 20 }) {
  const [a, b] = title.split(/\s+v\s+/i);
  if (!markFor(a) && !markFor(b)) return null;
  return (
    <span className="mark-pair" aria-hidden="true">
      <TeamMark name={a} size={size} />
      <TeamMark name={b} size={size} />
    </span>
  );
}
