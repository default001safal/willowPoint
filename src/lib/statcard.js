// Pure helpers for the stat-style cards (Live now, Next for Nepal).

// How an over's circle looks: big (10+ runs), low (under 10), none (total unknown).
export function overTone(runs) {
  if (runs == null) return 'none';
  return runs >= 10 ? 'big' : 'low';
}

// The over with the most runs so far (ties go to the later over), or -1.
export function bestOverIndex(markers) {
  let best = -1;
  markers.forEach((m, i) => {
    if (m.state === 'upcoming' || m.runs == null) return;
    if (best === -1 || m.runs >= markers[best].runs) best = i;
  });
  return best;
}

// Running totals after each over.
export const cumulative = (perOver = []) => perOver.reduce((acc, r) => [...acc, (acc.at(-1) ?? 0) + r], []);

const NPT_OFFSET_MIN = 5 * 60 + 45;

// Kick-off as a UTC timestamp, from a fixture's NPT date and time ("15:45 NPT"); null if TBC.
export function kickoffUTC(date, time) {
  const t = /(\d{1,2}):(\d{2})/.exec(time || '');
  if (!date || !t) return null;
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, Number(t[1]), Number(t[2])) - NPT_OFFSET_MIN * 60_000;
}

// "2d 03h", "5h 07m", or "Soon" once it's under a minute away.
export function countdownLabel(ms) {
  if (ms == null) return null;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Soon';
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}h` : `${h}h ${pad(m)}m`;
}

// "15:45 NPT" -> "15:45"; anything without a time -> null.
export const clockTime = (time) => /(\d{1,2}:\d{2})/.exec(time || '')?.[1] ?? null;
