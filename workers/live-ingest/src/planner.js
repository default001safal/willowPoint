export const SCORE_REFRESH_MS = 60_000;
export const FEED_REFRESH_MS = 60_000;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function matchFingerprint(match) {
  const { id, verifiedAt, order, ...facts } = match;
  return stable(facts);
}

export function emptyLiveCache(ids = []) {
  return { matches: Object.fromEntries(ids.map((id) => [id, null])), feed: null };
}

export function planLiveWrites(outcome, cache = emptyLiveCache(), now = Date.now()) {
  const previous = cache.matches || {};
  const next = { matches: {}, feed: cache.feed || null };
  const operations = [];
  const currentIds = new Set(outcome.matches.map((match) => match.id));

  outcome.matches.forEach((match, order) => {
    const fingerprint = matchFingerprint(match);
    const before = previous[match.id];
    const changed = !before || before.fingerprint !== fingerprint;
    const refreshDue = !before || now - before.refreshedAt >= SCORE_REFRESH_MS;
    if (changed || refreshDue) {
      const { id, ...fields } = match;
      operations.push({ type: 'set', collection: 'liveMatches', id, data: { ...fields, order } });
      next.matches[match.id] = { fingerprint, refreshedAt: now };
    } else {
      next.matches[match.id] = before;
    }
  });

  for (const id of Object.keys(previous)) {
    if (!currentIds.has(id)) operations.push({ type: 'delete', collection: 'liveMatches', id });
  }

  const feedFacts = {
    state: 'ok',
    sources: outcome.enabledSources,
    coverage: 'Nepal and selected internationals',
  };
  const feedFingerprint = stable(feedFacts);
  const feedBefore = cache.feed;
  if (!feedBefore || feedBefore.fingerprint !== feedFingerprint || now - feedBefore.refreshedAt >= FEED_REFRESH_MS) {
    operations.push({
      type: 'set', collection: 'config', id: 'feed',
      data: { ...feedFacts, checkedAt: new Date(now).toISOString() },
    });
    next.feed = { fingerprint: feedFingerprint, refreshedAt: now };
  }
  return { operations, cache: next };
}

export function planFeedError(cache = emptyLiveCache(), now = Date.now(), message = '', force = false) {
  const detail = String(message).slice(0, 300);
  const fingerprint = stable({ state: 'error', detail });
  const before = cache.feed;
  const changed = !before || before.fingerprint !== fingerprint;
  const due = !before || now - before.refreshedAt >= FEED_REFRESH_MS;
  const next = { ...cache, feed: before };
  const operations = [];
  if (force || changed || due) {
    operations.push({
      type: 'set', collection: 'config', id: 'feed',
      data: { state: 'error', detail, checkedAt: new Date(now).toISOString() },
    });
    next.feed = { fingerprint, refreshedAt: now };
  }
  return { operations, cache: next };
}
