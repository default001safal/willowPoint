import { kickoffUTC } from './statcard.js';

const nextFixtures = (content, now) => (content.fixtures || [])
  .filter((f) => f.nepal !== false && f.date >= content.today && (kickoffUTC(f.date, f.time) ?? Infinity) > now)
  .sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)));

const cite = (item, fallback) => ({ label: item.source || fallback, url: item.sourceUrl || null });
const answer = (text, sources = []) => ({ text, sources });

export function cueAnswer(question, content, now = Date.now()) {
  if (content.loadState === 'loading') return answer('I’m still loading the match data. Try again in a moment.');
  const q = question.toLowerCase();
  const next = nextFixtures(content, now)[0];
  const nextLine = next
    ? `Nepal’s next listed match is ${next.title} on ${next.date} at ${next.time || 'a time to be confirmed'} in ${next.venue || 'a venue to be confirmed'}.`
    : 'There is no confirmed upcoming Nepal fixture in the current schedule.';

  if (/live|score|right now|happening/.test(q)) {
    if (content.liveMatches?.length) {
      const m = content.liveMatches[0];
      return answer(`${m.batting.name} ${m.batting.runs}/${m.batting.wickets} (${m.batting.overs} overs) against ${m.bowling.name} ${m.bowling.runs}/${m.bowling.wickets}.`, [cite(m, m.series)]);
    }
    return answer(content.liveState === 'none'
      ? `No matches are live in the latest feed check. ${nextLine}`
      : `I don’t have a verified live score at the moment. ${nextLine}`, next ? [cite(next, 'App fixture record')] : []);
  }
  if (/next|fixture|schedule|when.*play/.test(q)) {
    return answer(nextLine, next ? [cite(next, 'App fixture record')] : []);
  }
  if (/npl|final|royals|lions/.test(q) && content.nplFinal) {
    const f = content.nplFinal;
    return f.result
      ? answer(`${f.result.winner} won the NPL final. ${f.result.summary}${f.result.detail ? `, with ${f.result.detail}` : ''}.`, [cite(f, 'App NPL result record')])
      : answer(`The listed NPL final is ${f.home} v ${f.away} on ${f.date} at ${f.time} NPT.`, [cite(f, 'App NPL fixture record')]);
  }
  if (/brief|latest|recap|doha/.test(q)) {
    const result = (content.results || [])
      .filter((r) => r.competition === 'Nepal' && r.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const resultLine = result ? `Most recent Nepal result in this app: ${result.summary} (${result.date}). The results list may be incomplete. ` : '';
    return answer(`${resultLine}${nextLine}`, [result && cite(result, 'App result record'), next && cite(next, 'App fixture record')].filter(Boolean));
  }
  return answer('I can check live scores, the next Nepal fixture, the latest listed result, or the NPL final. I don’t have a verified answer for that question yet.');
}
