// Live-score source parsers for willowPoint.
//
// Zero-dependency by design: the collector runs on a bare Node runtime in CI, so
// these parsers use nothing beyond string scanning — no DOM library, nothing to
// install or lock. Every parser fails closed: a page whose shape drifts yields zero
// candidates, and ingest-live.mjs treats an empty source page as a shape-change
// error rather than publishing anything.

const ORIGINS = {
  ndtv: 'https://sports.ndtv.com',
  cricbuzz: 'https://www.cricbuzz.com',
  wisden: 'https://www.wisden.com',
  // Staging mirrors for the detail pages: WILLOWPOINT_SOURCE_ORIGINS='{"cricbuzz":"http://localhost:8899"}'
  ...(process.env.WILLOWPOINT_SOURCE_ORIGINS ? JSON.parse(process.env.WILLOWPOINT_SOURCE_ORIGINS) : {}),
};

export function canonical(name = '') {
  const value = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return ({ 'united arab emirates': 'uae', 'united states of america': 'usa', 'pakistan shaheens': 'pakistan a' })[value] || value;
}

const key = (a, b) => [canonical(a), canonical(b)].sort().join('|');
// Coverage is not a team allowlist: any named cricket match can enter the same
// corroboration pipeline, while presentation remains Nepal-first.
const eligible = (a, b) => Boolean(canonical(a) && canonical(b));

function score(raw = '') {
  const match = /(\d+)(?:[\/-](\d+))?(?:\s*\((\d+(?:\.\d+)?)\))?/.exec(raw);
  return match ? { runs: Number(match[1]), wickets: match[2] == null ? null : Number(match[2]), overs: match[3] || null } : null;
}

// --- tiny HTML-scanning helpers (deliberately minimal; see header) -----------

function getAttr(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return match ? (match[1] ?? match[2]) : null;
}

const stripTags = (fragment) => fragment.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Inner text of the first element opened by openTagRe: text up to its matching
// close tag, with nested tags stripped. The elements we target never nest the
// same tag inside itself, so scanning to the next close tag is exact.
function textAfter(scope, openTagRe, closeTagName) {
  const open = openTagRe.exec(scope);
  if (!open) return '';
  const tail = scope.slice(open.index + open[0].length);
  const close = new RegExp(`</${closeTagName}\\s*>`, 'i').exec(tail);
  return stripTags(close ? tail.slice(0, close.index) : tail);
}

// From an opening <div ...> at `from`, slice through its matching </div>,
// honouring nesting depth. Returns '' when the document ends first.
function sliceDiv(html, from) {
  const re = /<div\b[^>]*>|<\/div\s*>/gi;
  re.lastIndex = from;
  let depth = 0;
  let match;
  while ((match = re.exec(html))) {
    depth += match[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(from, re.lastIndex);
  }
  return html.slice(from);
}

function* anchorTags(html) {
  yield* html.matchAll(/<a\b[^>]*>/gi);
}

// --- NDTV: the liveness authority (status text) + primary score --------------

const NDTV_CARD_OPEN = /<div\b[^>]*class="[^"]*\bsp-scr_wrp\b[^"]*\bvevent\b[^"]*"[^>]*>/gi;

export const countNdtvCards = (html) => [...html.matchAll(NDTV_CARD_OPEN)].length;

const within = (className) => new RegExp(`<([a-z0-9]+)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'gi');

export function parseNdtv(html) {
  return [...html.matchAll(NDTV_CARD_OPEN)].flatMap((cardOpen) => {
    const card = sliceDiv(html, cardOpen.index);
    const status = textAfter(card, within('scr_dt-red'), 'span');
    if (!/play in progress|innings break|day \d+.*session/i.test(status)) return [];
    const teams = [...card.matchAll(within('scr_tm-wrp'))].map((teamOpen) => {
      const block = sliceDiv(card, teamOpen.index);
      const runTag = within('scr_tm-run').exec(block);
      return {
        name: textAfter(block, within('scr_tm-nm'), 'span'),
        score: score(textAfter(block, within('scr_tm-run'), 'span')),
        active: Boolean(runTag && /\bscr_tm-scr-act\b/.test(runTag[0])),
      };
    });
    if (teams.length !== 2 || !eligible(teams[0].name, teams[1].name) || !teams.some((t) => t.score)) return [];
    const linkTag = /<a\b[^>]*class="[^"]*\bsp-scr_lnk\b[^"]*"[^>]*>/i.exec(card);
    const href = linkTag ? getAttr(linkTag[0], 'href') : null;
    return [{ key: key(teams[0].name, teams[1].name), teams,
      start: Date.parse(textAfter(card, within('dtstart'), 'span')),
      end: Date.parse(textAfter(card, within('dtend'), 'span')),
      status,
      series: textAfter(card, within('scr_txt-ony'), 'div'),
      venue: textAfter(card, within('location'), 'span'),
      note: textAfter(card, within('scr-inf_lt'), 'div'),
      crr: textAfter(card, within('scr-inf_rt'), 'div'),
      url: href ? new URL(href, ORIGINS.ndtv).href : null }];
  });
}

// --- Cricbuzz: listing strip + detail-page scores (corroboration) ------------

export function parseCricbuzz(html) {
  const found = new Map();
  // Titles read "Team1 vs Team2, Series - Status"; href and title may appear in
  // either order. We list every match that has a score to corroborate (anything
  // but a preview); liveness itself is decided by the explicit status signals on
  // the NDTV/Wisden cards, and a completed match's final score only ever
  // corroborates — it can never create a live record alone.
  for (const anchor of anchorTags(html)) {
    const tag = anchor[0];
    const href = getAttr(tag, 'href');
    const title = getAttr(tag, 'title') || '';
    if (!href || !href.startsWith('/live-cricket-scores/')) continue;
    const pair = /^(.+?) vs (.+?), .+ - (.+?)\s*$/.exec(title);
    if (!pair || !eligible(pair[1], pair[2])) continue;
    const status = pair[3];
    if (/preview|upcoming|abandon|cancel|postponed|delayed/i.test(status)) continue;
    const live = !/\b(?:won|complete|completed|drawn|tied|no result)\b/i.test(status);
    const id = key(pair[1], pair[2]);
    if (!found.has(id)) found.set(id, { key: id, teams: [pair[1], pair[2]], status, live, url: new URL(href, ORIGINS.cricbuzz).href });
  }
  return [...found.values()];
}

export const countCricbuzzStrips = (html) =>
  [...anchorTags(html)].filter((anchor) => {
    const tag = anchor[0];
    const href = getAttr(tag, 'href');
    return href && href.startsWith('/live-cricket-scores/') && getAttr(tag, 'title');
  }).length;

export function parseCricbuzzDetail(html) {
  const meta = /<meta\b[^>]*>/gi;
  let description = '';
  for (const tag of html.matchAll(meta)) {
    const attrs = tag[0];
    if (getAttr(attrs, 'name') === 'description' || getAttr(attrs, 'property') === 'og:description') {
      description = getAttr(attrs, 'content') || '';
      break;
    }
  }
  const matches = [...description.matchAll(/\b[A-Z]{2,5}\s+(\d+(?:\/\d+)?)(?:\s*\((\d+(?:\.\d+)?)\))?/g)];
  return matches.map((m) => score(`${m[1]}${m[2] ? ` (${m[2]})` : ''}`)).filter(Boolean);
}

// --- Wisden: tertiary liveness signal (explicit "Live" badge) ----------------

export const countWisdenCards = (html) =>
  [...anchorTags(html)].filter((anchor) => getAttr(anchor[0], 'href')?.startsWith('/match/')).length;

// A valid Wisden page with no Live badge is an independent idle signal. Requiring
// the expected title and heading prevents blocked or reshaped pages becoming one.
export const isWisdenScorePage = (html) =>
  /<title\b[^>]*>\s*Live Cricket Score\b/i.test(html) &&
  /<h1\b[^>]*>\s*Live Cricket Scores\s*<\/h1\s*>/i.test(html);

export function parseWisden(html) {
  return [...anchorTags(html)].flatMap((anchor) => {
    const href = getAttr(anchor[0], 'href');
    if (!href || !href.startsWith('/match/')) return [];
    const end = html.indexOf('</a>', anchor.index);
    const block = html.slice(anchor.index, end < 0 ? undefined : end);
    if (!/<span\b[^>]*>\s*Live\s*<\/span\s*>/i.test(block)) return [];
    const rows = [...block.matchAll(/<h2[^>]*>([^<]*)<\/h2>((?:(?!<h2\b).)*)/gi)]
      .slice(0, 2)
      .map((row) => ({ name: stripTags(row[1]), score: score(textAfter(row[2], /<span\b[^>]*>/i, 'span')) }));
    if (rows.length !== 2 || !eligible(rows[0].name, rows[1].name)) return [];
    return [{ key: key(rows[0].name, rows[1].name), teams: rows, url: new URL(href, ORIGINS.wisden).href }];
  });
}

// Normalize Wisden's explicit Live cards to the authority shape used by reconcile.
export function wisdenAuthorities(matches, now = Date.now()) {
  return matches.map((match) => ({
    ...match,
    source: 'Wisden',
    start: now,
    end: now,
    status: 'Live',
    series: 'Live cricket',
    venue: '',
    note: '',
    crr: '',
  }));
}

// --- cross-source agreement: publish only what independent pages confirm -----

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
    const wisdenAgrees = Boolean(m.source !== 'Wisden' && tertiary && compatible(m, [tertiary]));
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
      verifiedAt: new Date(now).toISOString(), source: m.source || 'NDTV Sports', sourceUrl: m.url,
      corroboratedBy: [cricbuzzAgrees && secondary.url, wisdenAgrees && tertiary.url].filter(Boolean),
    }];
  });
  const relevantElsewhere = [...cricbuzz, ...wisden].some((m) => !candidates.some((n) => n.key === m.key));
  if (!verified.length && (candidates.length || relevantElsewhere)) return { state: 'degraded', matches: [] };
  return { state: 'ok', matches: verified.sort((a, b) => Number(b.competition === 'Nepal') - Number(a.competition === 'Nepal')).slice(0, 3) };
}
