import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme.js';
import * as I from './Icons.js';
import FixtureRow from './FixtureRow.js';
import { SaveButton, SectionHead, parts } from './ui.js';
import { TextLink } from './LiveCard.js';
import { useContent } from '../lib/content.js';
import { upcomingFixtures } from '../lib/selectors.js';

export function StoryCard({ story, onOpen }) {
  const image = story.image || story.imageUrl;
  return (
    <Pressable style={styles.storyCard} onPress={onOpen}>
      {image ? <Image source={{ uri: image }} style={styles.storyImage} resizeMode="cover" /> : null}
      <View style={styles.tagrow}>
        <View style={styles.miniChip}><Text style={styles.miniChipText}>{story.source}</Text></View>
      </View>
      <Text style={styles.storyTitle} numberOfLines={3}>{story.title}</Text>
      {story.blurb ? <Text style={styles.dek} numberOfLines={2}>{story.blurb}</Text> : null}
      <Text style={styles.storyRead}>Original source ↗</Text>
    </Pressable>
  );
}

export default function DiscoverBrowse({ saved, toggleSaved, following, toggleFollow, onOpenSchedule, onOpenRecord }) {
  const { today, loadState, liveState, stories, worldNews, fixtures, liveMatches, featuredEvent, followTopics } = useContent();
  const upcoming = upcomingFixtures(fixtures, today).slice(0, 3);
  const followedTopics = following.filter((id) => followTopics.some((topic) => topic.id === id)).length;

  return (
    <View style={{ marginTop: 2 }}>
      <SectionHead title="Live now" leading={liveMatches.length ? <View style={styles.pulse} /> : null}
        right={liveMatches.length > 0 ? <Text style={styles.label}>{liveMatches.length} {liveMatches.length === 1 ? 'match' : 'matches'}</Text> : null} />
      {liveMatches.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recapGrid}>
          {liveMatches.map((match) => {
            const need = match.target != null ? Math.max(0, match.target - match.batting.runs) : null;
            return (
              <Pressable key={match.id} style={styles.rtile} onPress={() => onOpenRecord({ type: 'live', id: match.id })}>
                <View style={styles.evHead}>
                  <View style={styles.cal}><Text style={styles.calB}>{match.batting.runs}/{match.batting.wickets}</Text><Text style={styles.calS}>{match.batting.overs} OV</Text></View>
                  <Text style={styles.evT} numberOfLines={2}>{match.batting.name} v {match.bowling.name}</Text>
                  {need > 0 && match.ballsLeft != null && <View style={[styles.miniChip, styles.liveChip]}><Text style={styles.liveChipText}>{need} off {match.ballsLeft}</Text></View>}
                </View>
                <Text style={styles.evSub} numberOfLines={1}>{match.series} · {match.venue}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : <Text style={styles.emptyCompact}>{loadState === 'loading' ? 'Checking the verified live feed…' : liveState === 'none' ? 'No covered match is live right now.' : 'Live scores are unavailable until a fresh source check succeeds.'}</Text>}

      <SectionHead title="Beyond the boundary" right={<TextLink onPress={() => onOpenSchedule({})}>All fixtures →</TextLink>} />
      {upcoming.length > 0
        ? <View>{upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} today={today} saved={saved} toggleSaved={toggleSaved} onOpenRecord={onOpenRecord} />)}</View>
        : <Text style={styles.emptyCompact}>{loadState === 'loading' ? 'Checking confirmed fixtures…' : loadState === 'error' ? 'Fixtures could not refresh. Please try again later.' : 'No confirmed upcoming fixtures are listed yet.'}</Text>}

      {featuredEvent && (
        <View>
          <SectionHead title="Featured" />
          <View style={styles.eventCard}>
            <Pressable style={styles.eventOpen} onPress={() => onOpenRecord({ type: 'event', id: featuredEvent.id })}>
              <View style={styles.evHead}>
                <View style={styles.cal}><Text style={styles.calB}>{String(parts(featuredEvent.start).date).padStart(2, '0')}</Text><Text style={styles.calS}>{parts(featuredEvent.start).month}</Text></View>
                <Text style={styles.evT} numberOfLines={2}>{featuredEvent.short || featuredEvent.title}</Text>
              </View>
              <Text style={styles.evSub} numberOfLines={2}>{featuredEvent.title} · {featuredEvent.venue}{featuredEvent.note ? ` · ${featuredEvent.note}` : ''}</Text>
            </Pressable>
            <SaveButton label={featuredEvent.title} saved={saved.includes(featuredEvent.id)} onToggle={() => toggleSaved(featuredEvent.id)} />
          </View>
        </View>
      )}

      {stories.length > 0 && (
        <View>
          <SectionHead title="This week in Nepali cricket" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyTrack}>
            {stories.map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpenRecord({ type: 'story', id: story.id })} />)}
          </ScrollView>
        </View>
      )}

      {worldNews.length > 0 && (
        <View>
          <SectionHead title="Top stories" />
          <View style={styles.newsList}>{worldNews.map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpenRecord({ type: 'story', id: story.id })} />)}</View>
        </View>
      )}

      <View>
        <SectionHead title="Your cricket" />
        {followTopics.length > 0 ? (
          <View style={styles.teams}>
            {followTopics.map((item) => {
              const on = following.includes(item.id);
              return (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => toggleFollow(item.id)} style={[styles.teamPill, on && styles.teamPillOn]}>
                  <View style={[styles.ind, on && styles.indOn]} />
                  <Text style={[styles.teamPillText, on && styles.teamPillTextOn]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : <Text style={styles.emptyCompact}>{loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available to follow yet.'}</Text>}
        {followTopics.length > 0 && <Text style={styles.followcount}>{followedTopics} of {followTopics.length} followed</Text>}
      </View>

      <View style={styles.dataNote}>
        <I.Check size={13} color={colors.faint} />
        <Text style={styles.dataNoteText}>Records appear after source validation. Original publishers remain linked where supplied.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.crimson },
  label: { color: colors.faint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  recapGrid: { gap: 8, paddingRight: 20 },
  rtile: { width: 230, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 8 },
  evHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cal: { width: 44, alignItems: 'center' },
  calB: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  calS: { color: colors.muted, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  evT: { color: colors.text, fontSize: 13.5, fontWeight: '600', flex: 1 },
  evSub: { color: colors.muted, fontSize: 12 },
  miniChip: { alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  miniChipText: { color: colors.muted, fontSize: 10, letterSpacing: 0.4 },
  liveChip: { backgroundColor: '#2A1215' },
  liveChipText: { color: colors.crimsonText, fontSize: 10, fontWeight: '600' },
  emptyCompact: { color: colors.muted, fontSize: 13, paddingVertical: 6 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingRight: 6 },
  eventOpen: { flex: 1, padding: 12, gap: 6 },
  storyTrack: { gap: 10, paddingRight: 20 },
  storyCard: { width: 240, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, gap: 6 },
  storyImage: { width: '100%', height: 110, borderRadius: 10, backgroundColor: colors.surface2 },
  tagrow: { flexDirection: 'row' },
  storyTitle: { color: colors.text, fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  dek: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  storyRead: { color: colors.crimsonText, fontSize: 11.5, marginTop: 2 },
  newsList: { gap: 10 },
  teams: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.hairline, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.surface },
  teamPillOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  ind: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  indOn: { backgroundColor: colors.crimson },
  teamPillText: { color: colors.muted, fontSize: 12.5 },
  teamPillTextOn: { color: colors.text },
  followcount: { color: colors.faint, fontSize: 11, marginTop: 8 },
  dataNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 20, marginBottom: 8 },
  dataNoteText: { color: colors.faint, fontSize: 11, flex: 1, lineHeight: 15 },
});
