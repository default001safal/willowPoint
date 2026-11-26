import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { SaveButton } from '../components/ui.js';
import { MarkPair } from '../components/TeamMark.js';
import { useContent } from '../lib/content.js';
import { eventDates, resultTitle } from '../lib/selectors.js';
import { openRecord } from '../lib/navigationRef.js';

function getSavedItems(content, saved) {
  return saved.map((id) => {
    const event = content.events.find((item) => item.id === id);
    if (event) {
      const { start: startDate, end: endDate } = eventDates(event);
      return { id, title: event.title, meta: `${startDate} – ${endDate}${event.venue ? ` · ${event.venue}` : ''}`, layer: { type: 'event', id } };
    }
    const fixture = content.fixtures.find((item) => item.id === id);
    if (fixture) return { id, title: fixture.title, meta: `${fixture.date} · ${fixture.time || 'Time TBC'} · ${fixture.venue}`, layer: { type: 'fixture', id } };
    const result = content.results.find((item) => item.id === id);
    if (result) return { id, title: resultTitle(result), meta: result.summary, layer: { type: 'result', id } };
    return { id, title: 'Saved record unavailable', meta: 'This record is not in the current feed. Remove it or check again after the next verified refresh.', missing: true };
  });
}

export default function SavedScreen({ navigation, prefs }) {
  const content = useContent();
  const items = getSavedItems(content, prefs.saved);

  return (
    <Screen title="Saved records" eyebrow={`${items.length} ${items.length === 1 ? 'record' : 'records'}`} onClose={() => navigation.goBack()}>
      {content.loadState === 'loading' && !items.length ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Loading saved records…</Text>
          <Text style={styles.stateBody}>Your saved records will appear when the current feed arrives.</Text>
        </View>
      ) : items.length ? (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              {item.missing ? (
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={2}>{item.meta}</Text>
                </View>
              ) : (
                <Pressable style={styles.rowMain} onPress={() => openRecord(item.layer)}>
                  <View style={styles.rowTitleRow}>
                    <MarkPair title={item.title} size={14} />
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={styles.rowMeta} numberOfLines={2}>{item.meta}</Text>
                </Pressable>
              )}
              <SaveButton label={item.title} saved onToggle={() => prefs.toggleSaved(item.id)} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.state}>
          <I.Bookmark size={25} color={colors.dim} />
          <Text style={styles.stateTitle}>No saved records yet</Text>
          <Text style={styles.stateBody}>Save a fixture, result, or event to find it here.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12, paddingRight: 6 },
  rowMain: { flex: 1, gap: 3 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  rowMeta: { color: colors.muted, fontSize: 11.5 },
  state: { alignItems: 'center', gap: 8, padding: 30 },
  stateTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stateBody: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
