import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { useContent } from '../lib/content.js';
import { buildSearchSuggestions, DEFAULT_SEARCH } from '../lib/search.js';

const WINDOWS = [
  { id: 'current', label: 'Current records', hint: 'Live, upcoming, current events, recent results, and stories' },
  { id: 'all', label: 'Include archive', hint: 'Also search expired fixtures, completed events, and older results' },
];

// Bottom-sheet refinement — presented as a modal screen.
export default function SearchAssistScreen({ navigation, route }) {
  const content = useContent();
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_SEARCH, ...(route.params?.search || {}) }));
  const suggestions = useMemo(() => buildSearchSuggestions(content, 3), [content]);
  const setPatch = (patch) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <Screen title="Refine search" eyebrow="Search assist" onClose={() => navigation.goBack()}
      footer={(
        <View style={styles.footerRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => setDraft(DEFAULT_SEARCH)}>
            <Text style={styles.secondaryText}>Clear</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate({ name: 'Search', params: { initial: draft }, merge: true })}>
            <Text style={styles.primaryText}>Apply search</Text>
          </Pressable>
        </View>
      )}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Result type</Text>
        <View style={styles.pills}>
          {['All', 'Live', 'Fixtures', 'Events', 'Results', 'News'].map((scope) => (
            <Pressable key={scope} onPress={() => setPatch({ scope })} style={[styles.chip, draft.scope === scope && styles.chipOn]}>
              <Text style={[styles.chipText, draft.scope === scope && styles.chipTextOn]}>{scope}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Competition</Text>
        <View style={styles.pills}>
          {['Any', ...content.competitions].map((competition) => (
            <Pressable key={competition} onPress={() => setPatch({ competition })} style={[styles.chip, draft.competition === competition && styles.chipOn]}>
              <Text style={[styles.chipText, draft.competition === competition && styles.chipTextOn]}>{competition === 'Any' ? 'Any competition' : competition}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Record window</Text>
        <View style={{ gap: 6 }}>
          {WINDOWS.map((option) => (
            <Pressable key={option.id} onPress={() => setPatch({ window: option.id })} style={[styles.option, draft.window === option.id && styles.optionOn]}>
              <Text style={[styles.optionTitle, draft.window === option.id && styles.chipTextOn]}>{option.label}</Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Try a current record</Text>
        <View style={{ gap: 8 }}>
          {suggestions.map((suggestion) => (
            <Pressable key={suggestion.id} style={styles.hit} onPress={() => setPatch({ query: suggestion.query, scope: 'All', competition: 'Any' })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hitReason}>{suggestion.reason}</Text>
                <Text style={styles.hitTitle} numberOfLines={2}>{suggestion.label}</Text>
              </View>
              <I.Chevron size={14} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  label: { color: colors.text2, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  chipText: { color: colors.muted, fontSize: 12.5 },
  chipTextOn: { color: colors.text },
  option: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, backgroundColor: colors.surface, gap: 3 },
  optionOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  optionTitle: { color: colors.text2, fontSize: 13.5, fontWeight: '600' },
  optionHint: { color: colors.faint, fontSize: 11.5 },
  hit: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12 },
  hitReason: { color: colors.faint, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  hitTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12 },
  secondaryText: { color: colors.text2, fontSize: 13.5, fontWeight: '600' },
  primaryBtn: { flex: 2, alignItems: 'center', backgroundColor: colors.crimson, borderRadius: radius, paddingVertical: 12 },
  primaryText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
});
