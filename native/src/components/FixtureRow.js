import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './T.js';
import { colors, radius } from '../theme.js';
import * as I from './Icons.js';
import { SaveButton, parts, relativeDay } from './ui.js';
import { MarkPair } from './TeamMark.js';

export default function FixtureRow({ fixture, today, saved, toggleSaved, onOpenRecord, awaiting = false }) {
  const date = parts(fixture.date);
  return (
    <View style={styles.fixtureRow}>
      <Pressable style={styles.main} onPress={() => onOpenRecord({ type: 'fixture', id: fixture.id })}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateB}>{String(date.date).padStart(2, '0')}</Text>
          <Text style={styles.dateS}>{date.month}</Text>
        </View>
        <View style={styles.rowText}>
          <View style={styles.titleRow}>
            <MarkPair title={fixture.title} size={15} />
            <Text style={styles.title} numberOfLines={1}>{fixture.title}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>{awaiting ? `Status awaiting confirmation · ${fixture.venue}` : `${relativeDay(fixture.date, today)} · ${fixture.time || 'Time TBC'} · ${fixture.venue}`}</Text>
        </View>
        <I.Chevron size={15} color={colors.faint} />
      </Pressable>
      <SaveButton label={fixture.title} saved={saved.includes(fixture.id)} onToggle={() => toggleSaved(fixture.id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fixtureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingRight: 6, marginBottom: 8 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  dateBlock: { width: 44, alignItems: 'center' },
  dateB: { color: colors.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dateS: { color: colors.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1 },
  rowText: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12 },
});
