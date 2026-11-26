import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import FixtureRow from '../components/FixtureRow.js';
import { LiveScoreboard, TextLink } from '../components/LiveCard.js';
import DiscoverBrowse from '../components/DiscoverBrowse.js';
import { ScreenMasthead, SectionHead, parts } from '../components/ui.js';
import { useContent } from '../lib/content.js';
import { isLiveFixture } from '../lib/fixtures.js';
import { recentResults } from '../lib/selectors.js';
import { kickoffUTC } from '../lib/statcard.js';
import { openRecord, openSearch } from '../lib/navigationRef.js';

function Matches({ filter, saved, toggleSaved }) {
  const { today, loadState, liveMatches, fixtures, results: allResults } = useContent();
  const pass = (competition) => filter === 'All' || filter === competition;
  const results = recentResults(allResults, today);
  const live = liveMatches.filter((match) => pass(match.competition));
  const todayFixtures = fixtures.filter((fixture) => fixture.date === today && pass(fixture.competition) && !isLiveFixture(fixture, liveMatches, today));
  const laterToday = todayFixtures.filter((fixture) => (kickoffUTC(fixture.date, fixture.time) ?? Infinity) > Date.now());
  const awaiting = todayFixtures.filter((fixture) => (kickoffUTC(fixture.date, fixture.time) ?? Infinity) <= Date.now());
  const upcoming = fixtures.filter((fixture) => fixture.date > today && pass(fixture.competition));
  const done = results.filter((result) => pass(result.competition));
  const nothing = !live.length && !laterToday.length && !awaiting.length && !upcoming.length && !done.length;
  const todayParts = parts(today);

  return (
    <View style={{ marginTop: 4 }}>
      {nothing && <Text style={styles.empty}>{loadState === 'loading' ? 'Checking match data…' : loadState === 'error' ? 'Match data could not refresh. Please try again later.' : `Nothing current here for ${filter}.`}</Text>}

      {(live.length > 0 || laterToday.length > 0 || awaiting.length > 0) && (
        <View>
          <SectionHead title={`Today · ${todayParts.day} ${todayParts.date} ${todayParts.month}`} />
          {live.map((match) => (
            <Pressable key={match.id} style={styles.livecard} onPress={() => openRecord({ type: 'live', id: match.id })}>
              <Text style={styles.liveMeta}>{match.series} · {match.venue}</Text>
              <LiveScoreboard match={match} />
            </Pressable>
          ))}
          <View>
            {laterToday.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={openRecord} />)}
            {awaiting.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={openRecord} awaiting />)}
          </View>
        </View>
      )}

      {upcoming.length > 0 && (
        <View>
          <SectionHead title="Upcoming" />
          <View>{upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={openRecord} />)}</View>
        </View>
      )}

      {done.length > 0 && (
        <View>
          <SectionHead title="Recent results" />
          <View>
            {done.map((result) => (
              <Pressable key={result.id} style={styles.resultCard} onPress={() => openRecord({ type: 'result', id: result.id })}>
                <View style={styles.rowBetween}>
                  <Text style={styles.metaInline}>{result.label}</Text>
                  {result.status ? <View style={styles.miniChip}><Text style={styles.miniChipText}>{result.status}</Text></View> : null}
                </View>
                {(result.lines || []).map((line, index) => (
                  <View key={`${line.team}-${index}`} style={styles.resultLine}>
                    <Text style={[styles.resultTeam, index > 0 && styles.secondaryText]}>{line.team}</Text>
                    <Text style={[styles.resultScore, index > 0 && styles.secondaryText]}>{line.score}{line.overs ? <Text style={styles.resultOvers}> ({line.overs})</Text> : null}</Text>
                  </View>
                ))}
                <Text style={styles.resultSummary} numberOfLines={2}>{result.summary}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionFootnote}>Recent verified results · fixture times NPT</Text>
        </View>
      )}
    </View>
  );
}

function News() {
  const content = useContent();
  const stories = [...content.stories, ...content.worldNews];
  if (!stories.length) return <Text style={styles.empty}>No current, sourced stories are available yet.</Text>;
  return (
    <View style={{ marginTop: 4 }}>
      {stories.map((story) => (
        <Pressable key={story.id} style={styles.storyRow} onPress={() => openRecord({ type: 'story', id: story.id })}>
          <View style={styles.miniChip}><Text style={styles.miniChipText}>{story.source}</Text></View>
          <Text style={styles.storyTitle} numberOfLines={2}>{story.title}</Text>
          {story.blurb ? <Text style={styles.dek} numberOfLines={2}>{story.blurb}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const VIEWS = [
  { id: 'browse', label: 'Overview', Icon: I.Grid },
  { id: 'matches', label: 'All fixtures', Icon: I.Calendar },
  { id: 'news', label: 'Stories', Icon: I.ViewList },
];

function SearchLauncher({ label }) {
  return (
    <Pressable style={styles.searchBox} onPress={() => openSearch()} accessibilityRole="button">
      <I.Search size={17} color={colors.dim} />
      <Text style={styles.searchLabel}>{label}</Text>
    </Pressable>
  );
}

export default function DiscoverScreen({ prefs, route, navigation }) {
  const { competitions } = useContent();
  const [view, setView] = useState('browse');
  const [filter, setFilter] = useState('All');
  useEffect(() => {
    if (route.params?.filter) setFilter(route.params.filter);
  }, [route.params?.filter]);
  const filters = ['All', ...competitions];
  useEffect(() => {
    if (filter !== 'All' && !filters.includes(filter)) setFilter('All');
  }, [filter, filters.join('|')]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenMasthead onProfile={() => navigation.navigate('ProfileTab', { screen: 'Profile' })} label={null} />
      <Text style={styles.discH}>Discover</Text>
      <Text style={styles.discSub}>Every current match and recent result, in Nepal time.</Text>
      <SearchLauncher label="Search teams, matches, stories…" />
      <View style={styles.seg}>
        {VIEWS.map(({ id, label, Icon }) => (
          <Pressable key={id} onPress={() => setView(id)} style={[styles.segBtn, view === id && styles.segBtnOn]}>
            <Icon size={13} color={view === id ? colors.text : colors.muted} />
            <Text style={[styles.segText, view === id && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {view === 'browse' && (
        <DiscoverBrowse saved={prefs.saved} toggleSaved={prefs.toggleSaved} following={prefs.following} toggleFollow={prefs.toggleFollow} onOpenSchedule={() => setView('matches')} onOpenRecord={openRecord} />
      )}
      {view === 'matches' && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {filters.map((item) => (
              <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipOn]}>
                <Text style={[styles.chipText, filter === item && styles.chipTextOn]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Matches filter={filter} saved={prefs.saved} toggleSaved={prefs.toggleSaved} />
        </View>
      )}
      {view === 'news' && <News />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: 20, paddingBottom: 112 },
  discH: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 10 },
  discSub: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  searchLabel: { color: colors.faint, fontSize: 13.5 },
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 3, gap: 3, marginBottom: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius - 4 },
  segBtnOn: { backgroundColor: colors.surface2 },
  segText: { color: colors.muted, fontSize: 12 },
  segTextOn: { color: colors.text, fontWeight: '600' },
  pills: { gap: 6, paddingVertical: 8 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  chipText: { color: colors.muted, fontSize: 12.5 },
  chipTextOn: { color: colors.text },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 10 },
  livecard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, marginBottom: 8 },
  liveMeta: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  resultCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, marginBottom: 8, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaInline: { color: colors.faint, fontSize: 11 },
  miniChip: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  miniChipText: { color: colors.muted, fontSize: 10, letterSpacing: 0.4 },
  resultLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTeam: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  resultScore: { color: colors.text, fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  secondaryText: { color: colors.muted, fontWeight: '500' },
  resultOvers: { color: colors.faint, fontSize: 11, fontWeight: '400' },
  resultSummary: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  sectionFootnote: { color: colors.faint, fontSize: 11, marginTop: 4 },
  storyRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, marginBottom: 8, gap: 5 },
  storyTitle: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  dek: { color: colors.muted, fontSize: 12, lineHeight: 16 },
});
