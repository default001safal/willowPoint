import { currentEvents, fixturesForEvent, recentResults, resultTitle, upcomingFixtures } from './selectors.js';

const cite = (item, fallback) => ({ label: item.source || fallback, url: item.sourceUrl || null });
const answer = (text, sources = []) => ({ text, sources });
const STOP_WORDS = new Set(['about', 'after', 'answer', 'brief', 'briefing', 'could', 'cricket', 'current', 'give', 'have', 'know', 'latest', 'listed', 'match', 'me', 'my', 'next', 'play', 'please', 'question', 'recap', 'result', 'should', 'the', 'this', 'what', 'when', 'will', 'you']);
const words = (question) => question.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => !STOP_WORDS.has(word)) || [];
const recordText = (record) => [record.title, record.label, record.summary, record.competition, record.series, record.venue, record.date, ...(record.teams || []), ...(record.lines || []).map((line) => line.team)].filter(Boolean).join(' ').toLowerCase();
const matchingRecord = (records, question) => {
  const terms = words(question);
  if (!terms.length) return null;
  return records.find((record) => terms.every((term) => recordText(record).includes(term))) || records.find((record) => terms.some((term) => recordText(record).includes(term))) || null;
};

export function cueAnswer(question, content, now = Date.now()) {
  if (content.loadState === 'loading') return answer('I’m still loading the current records. Try again in a moment.');
  const q = question.toLowerCase();
  const upcoming = upcomingFixtures(content.fixtures || [], content.today, now);
  const nextNepal = upcoming.find((fixture) => fixture.nepal === true);
  const next = /nepal/.test(q) ? nextNepal : upcoming[0];
  const nextLine = next
    ? `${/nepal/.test(q) ? 'Nepal’s next listed match' : 'The next listed fixture'} is ${next.title} on ${next.date} at ${next.time || 'a time to be confirmed'} in ${next.venue || 'a venue to be confirmed'}.`
    : `There is no confirmed upcoming ${/nepal/.test(q) ? 'Nepal ' : ''}fixture in the current schedule.`;

  if (/live|score|right now|happening/.test(q)) {
    if (content.liveMatches?.length) {
      const match = matchingRecord(content.liveMatches, question) || content.liveMatches[0];
      return answer(`${match.batting.name} ${match.batting.runs}/${match.batting.wickets} (${match.batting.overs} overs) against ${match.bowling.name} ${match.bowling.runs}/${match.bowling.wickets}.`, [cite(match, match.series)]);
    }
    return answer(content.liveState === 'none'
      ? `No matches are live in the latest feed check. ${nextLine}`
      : `I don’t have a verified live score at the moment. ${nextLine}`, next ? [cite(next, 'App fixture record')] : []);
  }

  const results = [...(content.results || [])].filter((result) => result.date && result.date <= content.today).sort((a, b) => b.date.localeCompare(a.date));
  if (/recap|result|won|winner|champion|final|scorecard/.test(q)) {
    const result = matchingRecord(results, question) || (words(question).length ? null : results[0]);
    if (result) return answer(`${resultTitle(result)} · ${result.date}. ${result.summary}.`, [cite(result, 'App result record')]);
    return answer('I don’t have a verified result matching that question in the current records.');
  }

  if (/next|fixture|schedule|when.*play|what.*know/.test(q)) {
    const matched = matchingRecord(upcoming, question);
    const fixture = matched || (words(question).length ? null : next);
    if (fixture) return answer(`${fixture.title} is listed for ${fixture.date} at ${fixture.time || 'a time to be confirmed'} in ${fixture.venue || 'a venue to be confirmed'}. Times are NPT.`, [cite(fixture, 'App fixture record')]);
    return answer(words(question).length ? 'I don’t have a confirmed upcoming fixture matching that question.' : nextLine, next ? [cite(next, 'App fixture record')] : []);
  }

  if (/stor|news|headline/.test(q)) {
    const stories = [...(content.stories || []), ...(content.worldNews || [])].slice(0, 3);
    if (stories.length) return answer(stories.map((story) => story.title).join(' · '), stories.map((story) => cite(story, 'Original publisher')));
    return answer('There are no current sourced headlines in the app right now.');
  }

  const event = matchingRecord(currentEvents(content.events || [], content.today), question);
  if (event) {
    const matches = fixturesForEvent(event, content.fixtures || []);
    return answer(`${event.title} runs from ${event.start} to ${event.end}${event.venue ? ` in ${event.venue}` : ''}. The app currently links ${matches.length} verified ${matches.length === 1 ? 'fixture' : 'fixtures'} to this event.`, [cite(event, 'App event record')]);
  }

  if (/brief|latest|development|update/.test(q)) {
    const result = recentResults(results, content.today)[0];
    const resultLine = result ? `Most recent listed result: ${result.summary} (${result.date}). The results list may be incomplete. ` : '';
    return answer(`${resultLine}${nextLine}`, [result && cite(result, 'App result record'), next && cite(next, 'App fixture record')].filter(Boolean));
  }
  return answer('I can check current live scores, confirmed fixtures, current events, recent results, and sourced stories. I don’t have a verified answer for that question yet.');
}
