// A score is only live while a recent, sourced observation says it is live.
// Firestore's document update time is deliberately not used: an admin edit or
// replayed snapshot is not proof that the match is still in progress.
const LIVE_MAX_AGE_MS = 8 * 60_000;
const FEED_MAX_AGE_MS = 15 * 60_000;

function millis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : NaN;
}

function recent(value, now, maxAge) {
  const age = now - millis(value);
  return Number.isFinite(age) && age >= -30_000 && age <= maxAge;
}

export function livePresentation(matches = [], feed = null, now = Date.now()) {
  // A fresh collector failure is authoritative: never leave a recently verified
  // score on screen while the source checks that sustain it are failing.
  if (feed?.state === 'error' && recent(feed.checkedAt, now, FEED_MAX_AGE_MS)) {
    return { state: 'unavailable', matches: [] };
  }
  const current = matches.filter((m) =>
    m.status === 'live' &&
    typeof m.sourceUrl === 'string' && /^https:\/\//.test(m.sourceUrl) &&
    recent(m.verifiedAt, now, LIVE_MAX_AGE_MS),
  );
  if (current.length) return { state: 'live', matches: current };
  if (feed?.state === 'ok' && recent(feed.checkedAt, now, FEED_MAX_AGE_MS) && matches.length === 0) {
    return { state: 'none', matches: [] };
  }
  return { state: matches.length ? 'stale' : 'unavailable', matches: [] };
}
