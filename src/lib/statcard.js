// Pure helpers for the Home stat tiles: kick-off times and countdowns in Nepal time.

const NPT_OFFSET_MIN = 5 * 60 + 45;

// Kick-off as a UTC timestamp, from a fixture's NPT date and time ("15:45 NPT"); null if TBC.
export function kickoffUTC(date, time) {
  const t = /(\d{1,2}):(\d{2})/.exec(time || '');
  if (!date || !t) return null;
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, Number(t[1]), Number(t[2])) - NPT_OFFSET_MIN * 60_000;
}

// "2d 03h", "5h 07m", "Soon" under a minute away, "Now" once it has started.
export function countdownLabel(ms) {
  if (ms == null || Number.isNaN(ms)) return null;
  if (ms <= 0) return 'Now';
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
