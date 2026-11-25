// Live Cue engine for production.
// Grounding = the app's real content (Firestore when configured, snapshot otherwise),
// sent per request to our Cloudflare Worker, which holds the Moonshot key server-side.
// If the proxy is unreachable, Cue falls back to the on-device rule engine, which
// answers from the same real data — never from hardcoded demo copy.
import { cueAnswer } from './cueAnswers.js';

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
  const upcoming = (content.fixtures || []).filter((f) => f.date >= content.today).slice(0, 14);
  lines.push('UPCOMING FIXTURES:');
  upcoming.forEach((f) => lines.push(`- ${f.date} ${f.time || 'time TBC'}: ${f.title} at ${f.venue || 'venue TBC'}`));
  if (!upcoming.length) lines.push('- none listed');
  if (content.results?.length) {
    lines.push('RECENT RESULTS:');
    content.results.slice(0, 6).forEach((r) => lines.push(JSON.stringify(r)));
  }
  if (content.stories?.length) {
    lines.push('STORIES:');
    content.stories.slice(0, 6).forEach((s) => lines.push(`- ${s.title} (${s.source})`));
  }
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
    return { text, sources: [{ label: 'AI · kimi k3', url: null }], engine: 'ai' };
  } catch {
    // Offline / proxy down: same real data, on-device rules.
    return { ...cueAnswer(question, content), engine: 'local' };
  } finally {
    clearTimeout(killer);
  }
}
