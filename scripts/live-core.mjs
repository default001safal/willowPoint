// Runtime-neutral live collection shared by the Node fallback and Cloudflare Worker.
// Source access and timing are injected; this module never writes to Firestore.
import {
  countCricbuzzStrips,
  countNdtvCards,
  countWisdenCards,
  isWisdenScorePage,
  parseCricbuzz,
  parseCricbuzzDetail,
  parseNdtv,
  parseWisden,
  reconcile,
  wisdenAuthorities,
} from './live-sources.mjs';

export const DEFAULT_LIVE_URLS = {
  ndtv: 'https://sports.ndtv.com/cricket/live-scores',
  cricbuzz: 'https://www.cricbuzz.com/live-cricket-scores/0',
  wisden: 'https://www.wisden.com/live-cricket-scores',
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function degraded(sourceCounts, enabledSources, degradedSources) {
  return { state: 'degraded', matches: [], sourceCounts, enabledSources, degradedSources };
}

export async function collectVerifiedLive({
  fetchHtml,
  now = Date.now(),
  urls = DEFAULT_LIVE_URLS,
  detailGapMs = 250,
}) {
  if (typeof fetchHtml !== 'function') throw new TypeError('fetchHtml is required');
  const pages = {};
  const degradedSources = [];
  await Promise.all(Object.entries(urls).map(async ([name, url]) => {
    try {
      pages[name] = await fetchHtml(url);
    } catch (error) {
      pages[name] = null;
      degradedSources.push(`${name}: ${error.message}`);
    }
  }));

  const cricbuzz = pages.cricbuzz ? parseCricbuzz(pages.cricbuzz) : [];
  const wisden = pages.wisden ? parseWisden(pages.wisden) : [];
  const ndtv = pages.ndtv ? parseNdtv(pages.ndtv) : [];
  const sourceCounts = { ndtv: ndtv.length, cricbuzz: cricbuzz.length, wisden: wisden.length };
  if (!pages.cricbuzz || countCricbuzzStrips(pages.cricbuzz) === 0) {
    degradedSources.push('cricbuzz: unavailable or page shape changed');
    return degraded(sourceCounts, [], degradedSources);
  }

  // NDTV remains the preferred explicit liveness authority. Wisden can replace
  // it, but can never corroborate its own candidate; Cricbuzz detail is required.
  const authorities = ndtv.map((match) => ({ ...match, source: 'NDTV Sports' }));
  const enabledSources = ['cricbuzz'];
  if (pages.ndtv && countNdtvCards(pages.ndtv) > 0) enabledSources.unshift('ndtv');
  else degradedSources.push('ndtv: unavailable or page shape changed');

  const wisdenPageValid = Boolean(pages.wisden && isWisdenScorePage(pages.wisden));
  if (pages.wisden && countWisdenCards(pages.wisden) > 0) {
    enabledSources.push('wisden');
    const existing = new Set(authorities.map((match) => match.key));
    authorities.push(...wisdenAuthorities(wisden, now).filter((match) => !existing.has(match.key)));
  } else if (wisdenPageValid) {
    enabledSources.push('wisden');
  } else if (!authorities.length) {
    degradedSources.push('wisden: unavailable or page shape changed');
  }
  if (!authorities.length) {
    const noCoveredLiveMatch = cricbuzz.every((match) => !match.live) && wisden.length === 0;
    if (wisdenPageValid && noCoveredLiveMatch) {
      return { state: 'ok', matches: [], sourceCounts, enabledSources, degradedSources };
    }
    return degraded(sourceCounts, enabledSources, degradedSources);
  }

  // Fetch only detail pages that can actually corroborate an authority candidate.
  const cbByKey = new Map(cricbuzz.map((match) => [match.key, match]));
  const candidates = authorities.filter((match) => cbByKey.has(match.key)).slice(0, 8);
  const details = new Map();
  for (const match of candidates) {
    const url = cbByKey.get(match.key)?.url;
    if (!url) continue;
    try {
      details.set(match.key, parseCricbuzzDetail(await fetchHtml(url)));
    } catch (error) {
      degradedSources.push(`cricbuzz detail: ${error.message}`);
    }
    if (detailGapMs > 0) await pause(detailGapMs);
  }

  const outcome = reconcile(authorities, cricbuzz, wisden, details, now);
  return { ...outcome, sourceCounts, enabledSources, degradedSources };
}
