// Ground every answer in the app's current Firestore records. The Cloudflare
// proxy keeps the provider credential server-side; the on-device engine uses
// the same records when the proxy is unreachable.
import { cueAnswer } from './cueAnswers.js';
import { currentEvents, upcomingFixtures } from './selectors.js';

const PROXY_URL = (import.meta.env && import.meta.env.VITE_CUE_PROXY_URL)
  || 'https://cue-proxy.safalk309.workers.dev';

const SYSTEM = [
  'You are Cue, the assistant inside willowPoint, a Nepal-first cricket companion app.',
  'Voice: warm, concise, cricket-literate; a knowledgeable friend, not a commentator bot.',
  'Keep answers under 90 words unless the user asks for detail. Plain text; **bold** for scores, dates and names is fine.',
  'Ground every fixture, score, result and story claim in the APP DATA below. If it is not covered there, say so plainly and answer from general cricket knowledge only when safe.',
  'Never invent fixtures, scores, squad news, citations or URLs. Times are NPT (UTC+5:45).',
].join('\n');

function realContext(content) {
  const lines = [`APP DATA (verified app content; today NPT = ${content.today}):`];
  if (content.liveMatches?.length) {
    lines.push('LIVE MATCHES (fresh, source-verified):');
    content.liveMatches.forEach((m) => lines.push(JSON.stringify(m)));
  } else {
    lines.push('LIVE MATCHES: none verified right now — do not claim any match is live.');
  }
  const upcoming = upcomingFixtures(content.fixtures || [], content.today).slice(0, 20);
  lines.push('UPCOMING FIXTURES:');
  upcoming.forEach((fixture) => lines.push(JSON.stringify(fixture)));
  if (!upcoming.length) lines.push('- none listed');
  const events = currentEvents(content.events || [], content.today).slice(0, 12);
  lines.push('CURRENT OR UPCOMING EVENTS:');
  events.forEach((event) => lines.push(JSON.stringify(event)));
  if (!events.length) lines.push('- none listed');
  const results = (content.results || []).filter((result) => result.date <= content.today)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  lines.push('RESULTS:');
  results.forEach((result) => lines.push(JSON.stringify(result)));
  if (!results.length) lines.push('- none listed');
  const stories = [...(content.stories || []), ...(content.worldNews || [])].slice(0, 20);
  lines.push('CURRENT SOURCED HEADLINES:');
  stories.forEach((story) => lines.push(JSON.stringify(story)));
  if (!stories.length) lines.push('- none listed');
  return lines.join('\n');
}

export async function cueReply(question, content, history = []) {
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\n${realContext(content)}` },
    ...history.slice(-8),
    { role: 'user', content: question },
  ];
  const ctrl = new AbortController();
  const killer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('empty answer');
    return { text, sources: [{ label: 'Cue · current app records', url: null }], engine: 'ai' };
  } catch {
    // Offline / proxy down: same real data, on-device rules.
    return { ...cueAnswer(question, content), engine: 'local' };
  } finally {
    clearTimeout(killer);
  }
}
