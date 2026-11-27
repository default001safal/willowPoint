import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/T.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import CueMark from '../components/CueMark.js';
import LiveSection from '../components/LiveCard.js';
import NextForNepal from '../components/NextForNepal.js';
import { SaveButton, ScreenMasthead, SectionHead, parts } from '../components/ui.js';
import { useContent } from '../lib/content.js';
import { fixturesForEvent, recentResults, resultTitle } from '../lib/selectors.js';
import { openRecord, openSearch, askCue } from '../lib/navigationRef.js';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function QuickRecap() {
  const { results, today } = useContent();
  const recent = recentResults(results, today).slice(0, 5);
  if (!recent.length) return null;
  return (
    <View>
      <SectionHead title="Quick recap" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recapGrid}>
        {recent.map((result) => {
          const date = parts(result.date);
          return (
            <Pressable key={result.id} style={styles.rtile} onPress={() => openRecord({ type: 'result', id: result.id })}>
              <View style={styles.evHead}>
                <View style={styles.cal}><Text style={styles.calB}>{String(date.date).padStart(2, '0')}</Text><Text style={styles.calS}>{date.month}</Text></View>
                <Text style={styles.evT} numberOfLines={2}>{resultTitle(result)}</Text>
                <View style={styles.miniChip}><Text style={styles.miniChipText}>{result.competition || 'Result'}</Text></View>
              </View>
              <Text style={styles.evSub} numberOfLines={2}>{result.summary}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EventCard({ event, saved, toggleSaved }) {
  const { fixtures, today } = useContent();
  const games = fixturesForEvent(event, fixtures)
    .filter((fixture) => fixture.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));
  const start = parts(event.start);
  const end = parts(event.end);
  return (
    <View>
      <SectionHead title={event.short || event.title} />
      <View style={styles.eventCard}>
        <Pressable style={styles.eventOpen} onPress={() => openRecord({ type: 'event', id: event.id })}>
          <View style={styles.evHead}>
            <View style={styles.cal}><Text style={styles.calB}>{String(start.date).padStart(2, '0')}</Text><Text style={styles.calS}>{start.month}</Text></View>
            <Text style={styles.evT} numberOfLines={2}>{event.title}</Text>
          </View>
          <Text style={styles.evSub} numberOfLines={2}>{start.date} {start.month} – {end.date} {end.month} · {event.venue}{event.note ? ` · ${event.note}` : ''}</Text>
          {games.length > 0 && <Text style={styles.eventNext}>Next: {games[0].title}</Text>}
        </Pressable>
        <SaveButton label={event.title} saved={saved.includes(event.id)} onToggle={() => toggleSaved(event.id)} />
      </View>
      <Pressable onPress={() => askCue(`Give me a current briefing on ${event.title}.`)} hitSlop={6}>
        <Text style={styles.textAction}>Briefing with Cue</Text>
      </Pressable>
    </View>
  );
}

function HomeStories({ stories }) {
  if (!stories.length) return null;
  return (
    <View>
      <SectionHead title="Top stories" right={<TextLinkButton onPress={() => openSearch({ query: '', scope: 'News' })}>Explore →</TextLinkButton>} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyTrack}>
        {stories.map((story) => (
          <Pressable key={story.id} style={styles.storyCard} onPress={() => openRecord({ type: 'story', id: story.id })}>
            <View style={styles.miniChip}><Text style={styles.miniChipText}>{story.source}</Text></View>
            <Text style={styles.storyTitle} numberOfLines={3}>{story.title}</Text>
            {story.blurb ? <Text style={styles.dek} numberOfLines={2}>{story.blurb}</Text> : null}
            <Text style={styles.storyRead}>Read story ↗</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function TextLinkButton({ onPress, children }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={styles.seclink}>{children}</Text>
    </Pressable>
  );
}

function SearchLauncher({ label = 'Search matches, teams, stories…' }) {
  return (
    <Pressable style={styles.searchBox} onPress={() => openSearch()} accessibilityRole="button">
      <I.Search size={17} color={colors.dim} />
      <Text style={styles.searchLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ prefs, navigation }) {
  const { liveMatches, liveState, loadState, stories, featuredEvent } = useContent();
  const go = (tab, filter) => navigation.navigate('DiscoverTab', { screen: 'Discover', params: filter ? { filter } : undefined });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenMasthead onProfile={() => navigation.navigate('ProfileTab', { screen: 'Profile' })} />
      <Text style={styles.greet}>{greeting()}</Text>
      <SearchLauncher />
      <View style={styles.pills}>
        <Pressable style={[styles.chip, styles.cueChip]} onPress={() => askCue('Give me my quick Nepal cricket briefing')}>
          <CueMark size={14} />
          <Text style={styles.cueChipText}>Cue’s bird’s-eye view</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => go('discover', 'Nepal')}>
          <I.Calendar size={13} color={colors.muted} />
          <Text style={styles.chipText}>Nepal’s next match</Text>
        </Pressable>
        {featuredEvent && (
          <Pressable style={styles.chip} onPress={() => openSearch({ query: featuredEvent.title, scope: 'Events' })}>
            <I.Trophy size={13} color={colors.muted} />
            <Text style={styles.chipText}>{featuredEvent.short || featuredEvent.title}</Text>
          </Pressable>
        )}
        <Pressable style={styles.chip} onPress={() => navigation.navigate('ProfileTab', { screen: 'Saved' })}>
          <I.Bookmark size={13} color={colors.muted} />
          <Text style={styles.chipText}>Saved</Text>
        </Pressable>
      </View>

      <LiveSection matches={liveMatches} state={liveState} loading={loadState === 'loading'} onSeeAll={() => navigation.navigate('DiscoverTab', { screen: 'Discover' })} onOpenMatch={(match) => openRecord({ type: 'live', id: match.id })} />
      <QuickRecap />
      <NextForNepal saved={prefs.saved} toggleSaved={prefs.toggleSaved} onSeeAll={() => navigation.navigate('DiscoverTab', { screen: 'Discover', params: { filter: 'Nepal' } })} onOpenRecord={openRecord} />
      {featuredEvent && <EventCard event={featuredEvent} saved={prefs.saved} toggleSaved={prefs.toggleSaved} />}
      <HomeStories stories={stories} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: 20, paddingBottom: 112 },
  greet: { marginTop: 18, marginBottom: 16, color: colors.text, fontSize: 25, lineHeight: 30 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  searchLabel: { color: colors.faint, fontSize: 13.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.hairline, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.surface },
  chipText: { color: colors.text2, fontSize: 12.5 },
  cueChip: { borderColor: '#57202A', backgroundColor: '#1E1214' },
  cueChipText: { color: colors.crimsonText, fontSize: 12.5 },
  recapGrid: { gap: 8, paddingRight: 20 },
  rtile: { width: 230, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 8 },
  evHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cal: { width: 44, alignItems: 'center' },
  calB: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  calS: { color: colors.muted, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  evT: { color: colors.text, fontSize: 13.5, fontWeight: '600', flex: 1 },
  evSub: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  miniChip: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  miniChipText: { color: colors.muted, fontSize: 10, letterSpacing: 0.4 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingRight: 6 },
  eventOpen: { flex: 1, padding: 12, gap: 6 },
  eventNext: { color: colors.crimsonText, fontSize: 12, marginTop: 2 },
  textAction: { color: colors.crimsonText, fontSize: 12.5, marginTop: 10 },
  seclink: { color: colors.crimsonText, fontSize: 12.5 },
  storyTrack: { gap: 10, paddingRight: 20 },
  storyCard: { width: 240, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 6 },
  storyTitle: { color: colors.text, fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  dek: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  storyRead: { color: colors.crimsonText, fontSize: 11.5, marginTop: 2 },
});
