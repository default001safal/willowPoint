// A headline without a dated, reachable source must not be presented as news.
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export function currentStories(items = [], now = Date.now()) {
  return items.filter((item) => {
    const date = Date.parse(item.publishedAt || '');
    return /^https:\/\//.test(item.sourceUrl || '') && Number.isFinite(date) &&
      date <= now + 60_000 && now - date <= MAX_AGE_MS;
  });
}
