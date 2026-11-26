import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen.js';
import CueMark from '../components/CueMark.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { LiveScoreboard } from '../components/LiveCard.js';
import { TeamMark } from '../components/TeamMark.js';
import { parts, relativeDay } from '../components/ui.js';
import { useContent } from '../lib/content.js';
import { kickoffUTC } from '../lib/statcard.js';
import { eventDates, fixturesForEvent, resultTitle } from '../lib/selectors.js';
import { askCue, openRecord } from '../lib/navigationRef.js';

function DetailList({ items }) {
  const visible = items.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!visible.length) return null;
  return (
    <View style={styles.detailList}>
      {visible.map(([label, value]) => (
        <View key={label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function RecordActions({ saved, onSave, saveLabel, onAsk }) {
  return (
    <View style={styles.recordActions}>
      <Pressable style={styles.secondaryBtn} onPress={onSave}>
        <I.Bookmark size={16} color={saved ? colors.crimsonText : colors.text2} filled={saved} />
        <Text style={styles.secondaryText}>{saved ? 'Saved' : saveLabel || 'Save match'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={onAsk}>
        <CueMark size={16} />
        <Text style={styles.secondaryText}>Ask Cue</Text>
      </Pressable>
    </View>
  );
}

function checkedLabel(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return 'Recently checked';
  return `Checked ${new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time)} NPT`;
}

function FixtureDetail({ fixture, prefs }) {
  const content = useContent();
  const date = parts(fixture.date);
  const started = (kickoffUTC(fixture.date, fixture.time) ?? Infinity) <= Date.now();
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <Text style={styles.recordStatus}>{relativeDay(fixture.date, content.today)} · {date.date} {date.month}</Text>
      <Text style={styles.recordTitle}>{fixture.title}</Text>
      <Text style={styles.recordLede}>{started ? 'The scheduled start has arrived. A live score appears only after independent verification.' : 'Confirmed fixture information, shown in Nepal time.'}</Text>
      <DetailList items={[["Start", fixture.time || 'Time to be confirmed'], ["Venue", fixture.venue || 'Venue to be confirmed'], ["Competition", fixture.competition], ["Note", fixture.note]]} />
      <RecordActions saved={prefs.saved.includes(fixture.id)} onSave={() => prefs.toggleSaved(fixture.id)} onAsk={() => askCue(`What should I know about ${fixture.title} on ${fixture.date}?`)} />
      <Text style={styles.recordFootnote}>All fixture times are NPT. Changes appear after the next verified feed update.</Text>
    </ScrollView>
  );
}

function ResultDetail({ result, prefs }) {
  const title = resultTitle(result);
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <Text style={styles.recordStatus}>{result.label}</Text>
      <Text style={styles.recordTitle}>{title}</Text>
      {result.status ? <Text style={styles.resultStatus}>{result.status}</Text> : null}
      <View style={styles.scorecard}>
        {(result.lines || []).map((line, index) => (
          <View key={`${line.team}-${index}`} style={styles.scorecardRow}>
            <View style={styles.scorecardTeam}><TeamMark name={line.team} size={18} /><Text style={styles.scorecardName}>{line.team}</Text></View>
            <Text style={styles.scorecardScore}>{line.score}{line.overs ? <Text style={styles.scorecardOvers}>  {line.overs} overs</Text> : null}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.recordLede}>{result.summary}</Text>
      <RecordActions saved={prefs.saved.includes(result.id)} onSave={() => prefs.toggleSaved(result.id)} onAsk={() => askCue(`Recap this result: ${title}. ${result.summary}`)} />
      {result.source ? (
        <View style={styles.recordSource}>
          <Text style={styles.recordSourceLabel}>Source</Text>
          {result.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(result.sourceUrl)}>
              <Text style={styles.recordSourceLink}>{result.source || 'Original scorecard'} ↗</Text>
            </Pressable>
          ) : <Text style={styles.secondaryText}>{result.source}</Text>}
        </View>
      ) : null}
    </ScrollView>
  );
}

function LiveDetail({ match }) {
  const title = `${match.batting.name} v ${match.bowling.name}`;
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <View style={styles.liveStatusRow}><View style={styles.liveDot} /><Text style={styles.liveStatusText}>Live right now</Text></View>
      <Text style={styles.recordTitle}>{title}</Text>
      <Text style={styles.recordLede}>{match.venue}</Text>
      <LiveScoreboard match={match} />
      <View style={styles.liveDetailBoard}><LiveScoreboard match={match} detail /></View>
      <Pressable style={[styles.secondaryBtn, styles.cueAction]} onPress={() => askCue(`Give me the current match situation for ${match.batting.name} v ${match.bowling.name}.`)}>
        <CueMark size={16} />
        <Text style={styles.secondaryText}>Ask Cue about this match</Text>
      </Pressable>
      <View style={styles.recordSource}>
        <Text style={styles.recordSourceLabel}>{match.verifiedAt ? checkedLabel(match.verifiedAt) : 'Current verified score'}</Text>
        {match.sourceUrl ? (
          <Pressable onPress={() => Linking.openURL(match.sourceUrl)}>
            <Text style={styles.recordSourceLink}>{match.source || 'Scorecard'} ↗</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.recordFootnote}>Scores are published only after independent source agreement. Brief delays are possible during verification.</Text>
    </ScrollView>
  );
}

function StoryDetail({ story }) {
  const image = story.image || story.imageUrl || null;
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      {image ? <Image source={{ uri: image }} style={styles.storyImage} resizeMode="cover" /> : null}
      <Text style={styles.recordStatus}>{story.publishedAt ? checkedLabel(story.publishedAt).replace('Checked ', 'Published ') : story.date || 'Current story'}</Text>
      <Text style={styles.recordTitle}>{story.title}</Text>
      {story.blurb ? <Text style={styles.recordLede}>{story.blurb}</Text> : null}
      <Text style={styles.storyNote}>willowPoint publishes the verified headline and attribution here. The publisher’s original report contains the full story.</Text>
      {story.sourceUrl ? (
        <Pressable style={styles.primaryLink} onPress={() => Linking.openURL(story.sourceUrl)}>
          <Text style={styles.primaryLinkText}>Read at {story.source || 'original source'} ↗</Text>
        </Pressable>
      ) : <Text style={styles.recordFootnote}>No original article link is attached to this record.</Text>}
    </ScrollView>
  );
}

function EventDetail({ event, prefs }) {
  const content = useContent();
  const { start: startDate, end: endDate } = eventDates(event);
  const start = parts(startDate);
  const end = parts(endDate);
  const games = fixturesForEvent(event, content.fixtures).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <Text style={styles.recordStatus}>{start.date} {start.month} – {end.date} {end.month}</Text>
      <Text style={styles.recordTitle}>{event.title}</Text>
      <Text style={styles.recordLede}>{[event.venue, event.note].filter(Boolean).join(' · ')}</Text>
      <RecordActions saved={prefs.saved.includes(event.id)} saveLabel="Save event" onSave={() => prefs.toggleSaved(event.id)} onAsk={() => askCue(`Give me a current briefing on ${event.title}.`)} />
      <Text style={styles.subsectionTitle}>Matches in this event</Text>
      {games.length ? (
        <View style={styles.card}>
          {games.map((fixture) => (
            <Pressable key={fixture.id} style={styles.listRow} onPress={() => openRecord({ type: 'fixture', id: fixture.id })}>
              <View style={styles.dateBlock}><Text style={styles.dateB}>{parts(fixture.date).date}</Text><Text style={styles.dateS}>{parts(fixture.date).month}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.listTitle} numberOfLines={1}>{fixture.title}</Text><Text style={styles.listMeta}>{fixture.time || 'Time TBC'} · {fixture.venue}</Text></View>
            </Pressable>
          ))}
        </View>
      ) : <Text style={styles.emptyCompact}>No verified fixtures are attached to this event yet.</Text>}
      {event.source ? (
        <View style={styles.recordSource}>
          <Text style={styles.recordSourceLabel}>Source</Text>
          {event.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(event.sourceUrl)}>
              <Text style={styles.recordSourceLink}>{event.source || 'Original event record'} ↗</Text>
            </Pressable>
          ) : <Text style={styles.secondaryText}>{event.source}</Text>}
        </View>
      ) : null}
    </ScrollView>
  );
}

function MissingRecord({ loading }) {
  const content = useContent();
  const effective = loading || (content.loadState === 'loading' && !content.fixtures.length && !content.results.length && !content.liveMatches.length && !content.events.length);
  return (
    <View style={styles.detail}>
      <I.CricketBall size={24} color={colors.dim} />
      <Text style={styles.recordTitle}>{effective ? 'Loading the latest record…' : 'This record is not in the current feed'}</Text>
      <Text style={styles.recordLede}>{effective ? 'The detail view will update when current data arrives.' : 'It may have expired or been replaced during a refresh. Go back and choose an available record.'}</Text>
    </View>
  );
}

export default function RecordScreen({ navigation, route, prefs }) {
  const { type, id } = route.params || {};
  const content = useContent();

  let title = 'Record';
  let eyebrow = 'Current feed';
  let body = <MissingRecord />;

  if (type === 'fixture') {
    const fixture = content.fixtures.find((item) => item.id === id);
    title = 'Match details';
    eyebrow = fixture?.competition || 'Fixture';
    body = fixture ? <FixtureDetail fixture={fixture} prefs={prefs} /> : <MissingRecord />;
  } else if (type === 'result') {
    const result = content.results.find((item) => item.id === id);
    title = 'Match result';
    eyebrow = result?.competition || 'Result';
    body = result ? <ResultDetail result={result} prefs={prefs} /> : <MissingRecord />;
  } else if (type === 'live') {
    const match = content.liveMatches.find((item) => item.id === id);
    title = 'Live match';
    eyebrow = match?.series || 'Verified score';
    body = match ? <LiveDetail match={match} /> : <MissingRecord />;
  } else if (type === 'story') {
    const story = content.stories.find((item) => item.id === id) || content.worldNews.find((item) => item.id === id);
    title = content.worldNews.some((item) => item.id === id) ? 'World cricket' : 'Story';
    eyebrow = story?.source || 'Cricket news';
    body = story ? <StoryDetail story={story} /> : <MissingRecord />;
  } else if (type === 'event') {
    const event = content.events.find((item) => item.id === id);
    title = event?.short || 'Competition';
    eyebrow = 'Event';
    body = event ? <EventDetail event={event} prefs={prefs} /> : <MissingRecord />;
  }

  return (
    <Screen title={title} eyebrow={eyebrow} onClose={() => navigation.goBack()}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  detail: { padding: 20, gap: 12 },
  recordStatus: { color: colors.faint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  recordTitle: { color: colors.text, fontSize: 21, fontWeight: '700', lineHeight: 27 },
  recordLede: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  recordFootnote: { color: colors.faint, fontSize: 11.5, lineHeight: 16 },
  detailList: { borderTopWidth: 1, borderTopColor: colors.divider },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailLabel: { color: colors.faint, fontSize: 12 },
  detailValue: { color: colors.text2, fontSize: 13, flex: 1, textAlign: 'right' },
  recordActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, backgroundColor: colors.surface },
  secondaryText: { color: colors.text2, fontSize: 13, fontWeight: '600' },
  resultStatus: { color: colors.crimsonText, fontSize: 12, fontWeight: '600' },
  scorecard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 8 },
  scorecardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorecardTeam: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  scorecardName: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  scorecardScore: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  scorecardOvers: { color: colors.faint, fontSize: 11, fontWeight: '400' },
  recordSource: { gap: 4 },
  recordSourceLabel: { color: colors.faint, fontSize: 11 },
  recordSourceLink: { color: colors.crimsonText, fontSize: 13, fontWeight: '600' },
  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crimson },
  liveStatusText: { color: colors.crimsonText, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' },
  liveDetailBoard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius },
  cueAction: { marginTop: 4 },
  storyImage: { width: '100%', height: 180, borderRadius: radius, backgroundColor: colors.surface2 },
  storyNote: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  primaryLink: { alignSelf: 'flex-start' },
  primaryLinkText: { color: colors.crimsonText, fontSize: 14, fontWeight: '700' },
  subsectionTitle: { color: colors.text2, fontSize: 13, fontWeight: '700', marginTop: 6 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dateBlock: { width: 44, alignItems: 'center' },
  dateB: { color: colors.text, fontSize: 16, fontWeight: '700' },
  dateS: { color: colors.muted, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  listTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  listMeta: { color: colors.muted, fontSize: 11.5 },
  emptyCompact: { color: colors.muted, fontSize: 12.5 },
});
