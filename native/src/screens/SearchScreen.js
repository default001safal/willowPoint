import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Text, { TextInput } from '../components/T.js';
import Screen from '../components/Screen.js';
import CueMark from '../components/CueMark.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { useContent } from '../lib/content.js';
import { eventDates, resultTitle } from '../lib/selectors.js';
import {
  buildSearchIndex,
  buildSearchSuggestions,
  cueEscalationReason,
  DEFAULT_SEARCH,
  searchIsFiltered,
  searchRecords,
  SEARCH_SCOPES,
} from '../lib/search.js';
import { askCue, openRecord } from '../lib/navigationRef.js';

function hitMeta(hit, content) {
  if (hit.scope === 'Live') {
    const match = content.liveMatches.find((item) => item.id === hit.id);
    return match ? `${match.series || 'Live'} · ${match.venue || 'Venue TBC'} · ${match.batting.runs}/${match.batting.wickets}` : 'Verified live score';
  }
  if (hit.scope === 'Fixtures') {
    const fixture = content.fixtures.find((item) => item.id === hit.id);
    if (!fixture) return 'Fixture record';
    return `${fixture.date} · ${fixture.time || 'Time TBC'} · ${fixture.venue || 'Venue TBC'}`;
  }
  if (hit.scope === 'Events') {
    const event = content.events.find((item) => item.id === hit.id);
    if (!event) return 'Event record';
    const { start, end } = eventDates(event);
    return `${start} – ${end}${event.venue ? ` · ${event.venue}` : ''}`;
  }
  if (hit.scope === 'Results') {
    const result = content.results.find((item) => item.id === hit.id);
    return result ? `${result.label || 'Verified result'} · ${result.summary || resultTitle(result)}` : 'Verified result';
  }
  const story = content.stories.find((item) => item.id === hit.id) || content.worldNews.find((item) => item.id === hit.id);
  return story ? `${story.source || 'Original source'}${story.date ? ` · ${story.date}` : ''}` : 'Current story';
}

export default function SearchScreen({ navigation, route }) {
  const content = useContent();
  const [search, setSearch] = useState({ ...DEFAULT_SEARCH, ...(route.params?.initial || {}) });
  const inputRef = useRef(null);
  const index = useMemo(() => buildSearchIndex(content), [content]);
  const hits = useMemo(() => searchRecords(index, search), [index, search]);
  const suggestions = useMemo(() => buildSearchSuggestions(content), [content]);
  const trimmedQuery = search.query.trim();
  const filtered = searchIsFiltered(search);
  const reason = cueEscalationReason(trimmedQuery, hits.length);
  const setSearchPatch = (patch) => setSearch((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // SearchAssist applies refinements by merging new params into this screen.
  useEffect(() => {
    if (route.params?.initial) setSearch({ ...DEFAULT_SEARCH, ...route.params.initial });
  }, [route.params?.initial]);

  const data = trimmedQuery || filtered ? hits : suggestions;

  return (
    <Screen title="Search" eyebrow="Universal record search" onClose={() => navigation.goBack()}>
      <View style={styles.searchBox}>
        <I.Search size={17} color={colors.dim} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Teams, players, venues, competitions…"
          placeholderTextColor={colors.faint}
          value={search.query}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(query) => setSearchPatch({ query })}
        />
        <Pressable accessibilityLabel="Open search refinement" onPress={() => navigation.navigate('SearchAssist', { search })} hitSlop={8}>
          <I.Sliders size={17} color={colors.dim} />
        </Pressable>
      </View>

      <View style={styles.scopeRow}>
        {SEARCH_SCOPES.map((scope) => (
          <Pressable key={scope} onPress={() => setSearchPatch({ scope })} style={[styles.chip, search.scope === scope && styles.chipOn]}>
            <Text style={[styles.chipText, search.scope === scope && styles.chipTextOn]}>{scope}</Text>
          </Pressable>
        ))}
      </View>

      {reason && (
        <View style={styles.escalation}>
          <View style={styles.escalationRow}>
            <CueMark size={16} />
            <Text style={styles.escalationText}>{reason}</Text>
          </View>
          <Pressable onPress={() => askCue(trimmedQuery)}>
            <Text style={styles.escalationAction}>Ask Cue instead</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.key || item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={trimmedQuery || filtered ? (
          <View style={styles.secRow}>
            <Text style={styles.metaInline}>{hits.length} {hits.length === 1 ? 'record' : 'records'}{trimmedQuery ? ` for “${trimmedQuery}”` : ''}</Text>
            {searchIsFiltered(search) && (
              <Pressable onPress={() => setSearch(DEFAULT_SEARCH)} hitSlop={6}><Text style={styles.reset}>Reset</Text></Pressable>
            )}
          </View>
        ) : <Text style={styles.metaInline}>Suggested from current records</Text>}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No record matched that search</Text>
            <Text style={styles.emptyBody}>{trimmedQuery ? 'Current records stay exact. Ask Cue when the question needs interpretation, context, or an unusual cross-record answer.' : 'No current records match those refinements.'}</Text>
            {trimmedQuery ? (
              <Pressable style={styles.askCueBtn} onPress={() => askCue(trimmedQuery)}>
                <CueMark size={16} />
                <Text style={styles.askCueText}>Ask Cue about “{trimmedQuery}”</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setSearch(search.window === 'current' ? { ...search, window: 'all' } : DEFAULT_SEARCH)}>
                <Text style={styles.escalationAction}>{search.window === 'current' ? 'Include archive' : 'Reset search'}</Text>
              </Pressable>
            )}
          </View>
        )}
        renderItem={({ item }) => {
          if (!trimmedQuery && !filtered) {
            return (
              <Pressable style={styles.hit} onPress={() => (item.record ? openRecord(item.record) : setSearchPatch({ query: item.query }))}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hitReason}>{item.reason}</Text>
                  <Text style={styles.hitTitle} numberOfLines={2}>{item.label}</Text>
                </View>
                <I.Chevron size={14} color={colors.faint} />
              </Pressable>
            );
          }
          return (
            <Pressable style={styles.hit} onPress={() => openRecord(item.record)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hitTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.hitMeta} numberOfLines={2}>{hitMeta(item, content)}</Text>
              </View>
              <View style={[styles.miniChip, item.scope === 'Live' && styles.liveChip]}><Text style={[styles.miniChipText, item.scope === 'Live' && styles.liveChipText]}>{item.scope}</Text></View>
              <I.Chevron size={14} color={colors.faint} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 11, margin: 20, marginBottom: 10 },
  input: { flex: 1, color: colors.text, fontSize: 14 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  chipText: { color: colors.muted, fontSize: 12 },
  chipTextOn: { color: colors.text },
  escalation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#1E1214', borderWidth: 1, borderColor: '#57202A', borderRadius: radius, padding: 12, marginHorizontal: 20, marginBottom: 10 },
  escalationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  escalationText: { color: colors.text2, fontSize: 12.5, flex: 1 },
  escalationAction: { color: colors.crimsonText, fontSize: 12.5, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 8 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metaInline: { color: colors.faint, fontSize: 11, marginBottom: 4 },
  reset: { color: colors.crimsonText, fontSize: 12 },
  hit: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12 },
  hitReason: { color: colors.faint, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  hitTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  hitMeta: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  miniChip: { backgroundColor: colors.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  miniChipText: { color: colors.muted, fontSize: 10 },
  liveChip: { backgroundColor: '#2A1215' },
  liveChipText: { color: colors.crimsonText, fontWeight: '600' },
  emptyState: { alignItems: 'flex-start', gap: 8, padding: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  askCueBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  askCueText: { color: colors.crimsonText, fontSize: 13, fontWeight: '600' },
});
