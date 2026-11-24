import { load } from 'cheerio';

const ORIGINS = {
  ndtv: 'https://sports.ndtv.com',
  cricbuzz: 'https://www.cricbuzz.com',
  wisden: 'https://www.wisden.com',
  // Staging mirrors for the detail pages: WILLOWPOINT_SOURCE_ORIGINS='{"cricbuzz":"http://localhost:8899"}'
  ...(process.env.WILLOWPOINT_SOURCE_ORIGINS ? JSON.parse(process.env.WILLOWPOINT_SOURCE_ORIGINS) : {}),
};

const COUNTRIES = new Set([
  'nepal', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'afghanistan', 'australia',
  'england', 'new zealand', 'south africa', 'west indies', 'ireland', 'zimbabwe',
  'uae', 'oman', 'namibia', 'netherlands', 'scotland', 'canada', 'usa', 'italy',
  'uganda', 'jersey', 'kuwait',
]);
const NPL_TEAMS = new Set(['lumbini lions', 'sudurpaschim royals', 'chitwan rhinos', 'pokhara avengers', 'janakpur bolts', 'karnali yaks', 'biratnagar kings', 'kathmandu gurkhas']);

export function canonical(name = '') {
  const value = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return ({ 'united arab emirates': 'uae', 'united states of america': 'usa', 'pakistan shaheens': 'pakistan a' })[value] || value;
}

const key = (a, b) => [canonical(a), canonical(b)].sort().join('|');
const eligible = (a, b) => {
  const x = canonical(a); const y = canonical(b);
  return x.includes('nepal') || y.includes('nepal') || (COUNTRIES.has(x) && COUNTRIES.has(y)) || (NPL_TEAMS.has(x) && NPL_TEAMS.has(y));
};

function score(raw = '') {
  const match = /(\d+)(?:[\/-](\d+))?(?:\s*\((\d+(?:\.\d+)?)\))?/.exec(raw);
  return match ? { runs: Number(match[1]), wickets: match[2] == null ? null : Number(match[2]), overs: match[3] || null } : null;
}

export function parseNdtv(html) {
  const $ = load(html);
  return $('.sp-scr_wrp.vevent').toArray().flatMap((node) => {
    const card = $(node);
    const status = card.find('.scr_inf-wrp .scr_dt-red').first().text().trim();
    if (!/play in progress|innings break|day \d+.*session/i.test(status)) return [];
    const teams = card.find('.scr_tm-wrp').toArray().map((element) => {
      const e = $(element);
      return { name: e.find('.scr_tm-nm').first().text().trim(), score: score(e.find('.scr_tm-run').first().text()), active: e.find('.scr_tm-scr-act').length > 0 };
    });
    if (teams.length !== 2 || !eligible(teams[0].name, teams[1].name) || !teams.some((t) => t.score)) return [];
    const href = card.find('a.sp-scr_lnk').first().attr('href');
    const start = Date.parse(card.find('.dtstart').first().text());
    const end = Date.parse(card.find('.dtend').first().text());
    return [{ key: key(teams[0].name, teams[1].name), teams, start, end, status,
      series: card.find('.scr_txt-ony').first().text().trim(),
      venue: card.find('.location').first().text().trim(),
      note: card.find('.scr-inf_lt').first().text().trim(),
      crr: card.find('.scr-inf_rt').first().text().trim(),
      url: href ? new URL(href, ORIGINS.ndtv).href : null }];
  });
}

// Cricbuzz's match strip titles read "Team1 vs Team2, Series - Status". We list every
// match that has a score to corroborate (anything but a preview); liveness itself is
// decided by the explicit status signals on the NDTV/Wisden cards, and a completed
// match's final score only ever corroborates — it can never create a live record alone.
export function parseCricbuzz(html) {
  const $ = load(html);
  const found = new Map();
  $('a[title][href^="/live-cricket-scores/"]').each((_, node) => {
    const element = $(node);
    const title = element.attr('title') || '';
    const pair = /^(.+?) vs (.+?), .+ - (.+?)\s*$/.exec(title);
    if (!pair || !eligible(pair[1], pair[2])) return;
    if (/preview|abandon|cancel|postponed|delayed/i.test(pair[3])) return;
    const id = key(pair[1], pair[2]);
    if (!found.has(id)) found.set(id, { key: id, teams: [pair[1], pair[2]], url: new URL(element.attr('href'), ORIGINS.cricbuzz).href });
  });
  return [...found.values()];
}

export function parseCricbuzzDetail(html) {
  const $ = load(html);
  const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  const matches = [...description.matchAll(/\b[A-Z]{2,5}\s+(\d+(?:\/\d+)?)(?:\s*\((\d+(?:\.\d+)?)\))?/g)];
  return matches.map((m) => score(`${m[1]}${m[2] ? ` (${m[2]})` : ''}`)).filter(Boolean);
}

export function parseWisden(html) {
  const $ = load(html);
  return $('a[href^="/match/"]').toArray().flatMap((node) => {
    const e = $(node);
    if (!e.find('span').toArray().some((s) => $(s).text().trim().toLowerCase() === 'live')) return [];
    const teams = e.find('h2').toArray().slice(0, 2).map((h) => $(h).text().trim());
    if (teams.length !== 2 || !eligible(teams[0], teams[1])) return [];
    const rows = e.find('h2').toArray().slice(0, 2).map((h) => {
      const parent = $(h).parent();
      const row = parent.parent().find('h2').length === 1 ? parent.parent() : parent;
      return { name: $(h).text().trim(), score: score(row.find('span').last().text()) };
    });
    return [{ key: key(...teams), teams: rows, url: new URL(e.attr('href'), ORIGINS.wisden).href }];
  });
}

export function compatible(primary, checks) {
  const active = primary.teams.find((t) => t.active && t.score) || primary.teams.find((t) => t.score);
  if (!active) return false;
  return checks.some((check) => {
    const candidate = check.teams?.find((t) => canonical(t.name) === canonical(active.name))?.score;
    if (!candidate) return false;
    return candidate.wickets === active.score.wickets && Math.abs(candidate.runs - active.score.runs) <= 12 &&
      (!candidate.overs || !active.score.overs || Math.abs(Number(candidate.overs) - Number(active.score.overs)) <= 1.4);
  });
}

function detailCompatible(primary, detail = []) {
  const active = primary.teams.find((t) => t.active && t.score) || primary.teams.find((t) => t.score);
  if (!active) return false;
  return detail.some((candidate) =>
    candidate.wickets === active.score.wickets &&
    Math.abs(candidate.runs - active.score.runs) <= 12 &&
    (!candidate.overs || !active.score.overs || Math.abs(Number(candidate.overs) - Number(active.score.overs)) <= 1.4),
  );
}

export function reconcile(ndtv, cricbuzz, wisden, details = new Map(), now = Date.now()) {
  const cb = new Map(cricbuzz.map((m) => [m.key, m]));
  const ws = new Map(wisden.map((m) => [m.key, m]));
  const candidates = ndtv.filter((m) => m.start <= now + 3_600_000 && (!Number.isFinite(m.end) || m.end + 86_400_000 >= now));
  const verified = candidates.flatMap((m) => {
    const secondary = cb.get(m.key); const tertiary = ws.get(m.key);
    const detail = details.get(m.key);
    const cricbuzzAgrees = Boolean(secondary && detail?.length && detailCompatible(m, detail));
    const wisdenAgrees = Boolean(tertiary && compatible(m, [tertiary]));
    if (!cricbuzzAgrees && !wisdenAgrees) return [];
    const active = m.teams.find((t) => t.active) || m.teams[0];
    const other = m.teams.find((t) => t !== active);
    const need = /need (\d+) runs? in (\d+) balls?/i.exec(m.note);
    const rate = /CRR\s*(\d+(?:\.\d+)?)/i.exec(m.crr);
    return [{
      id: m.key.replace(/[^a-z0-9|]/g, '-').replace('|', '-vs-'), status: 'live',
      batting: { name: active.name, runs: active.score?.runs ?? null, wickets: active.score?.wickets ?? null, overs: active.score?.overs ?? '—' },
      bowling: { name: other.name, runs: other.score?.runs ?? null, wickets: other.score?.wickets ?? null, overs: other.score?.overs ?? '—' },
      series: m.series, venue: m.venue, competition: m.key.includes('nepal') ? 'Nepal' : 'World',
      target: need ? Number(need[1]) + active.score.runs : null,
      ballsLeft: need ? Number(need[2]) : null,
      runRate: rate?.[1] || null, requiredRate: need ? (Number(need[1]) * 6 / Number(need[2])).toFixed(2) : null,
      verifiedAt: new Date(now).toISOString(), source: 'NDTV Sports', sourceUrl: m.url,
      corroboratedBy: [cricbuzzAgrees && secondary.url, wisdenAgrees && tertiary.url].filter(Boolean),
    }];
  });
  const relevantElsewhere = [...cricbuzz, ...wisden].some((m) => !candidates.some((n) => n.key === m.key));
  if (!verified.length && (candidates.length || relevantElsewhere)) return { state: 'degraded', matches: [] };
  return { state: 'ok', matches: verified.sort((a, b) => Number(b.competition === 'Nepal') - Number(a.competition === 'Nepal')).slice(0, 3) };
}
