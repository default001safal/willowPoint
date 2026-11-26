import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { ScreenMasthead, SectionHead } from '../components/ui.js';
import { useContent } from '../lib/content.js';
import { watchUser } from '../lib/firebase.js';
import { openRecord } from '../lib/navigationRef.js';

function getSavedItems(content, saved) {
  return saved.map((id) => {
    const event = content.events.find((item) => item.id === id);
    if (event) return { id, title: event.title, meta: `${event.start || event.date} – ${event.end || event.endDate || event.start || event.date}`, layer: { type: 'event', id } };
    const fixture = content.fixtures.find((item) => item.id === id);
    if (fixture) return { id, title: fixture.title, meta: `${fixture.date} · ${fixture.time || 'Time TBC'} · ${fixture.venue}`, layer: { type: 'fixture', id } };
    const result = content.results.find((item) => item.id === id);
    if (result) return { id, title: result.label || 'Match result', meta: result.summary, layer: { type: 'result', id } };
    return { id, title: 'Saved record unavailable', meta: 'This record is not in the current feed. Remove it or check again after the next verified refresh.', missing: true };
  });
}

export default function ProfileScreen({ prefs, navigation }) {
  const { saved, following, toggleFollow, synced } = prefs;
  const customFollows = prefs.customFollows || [];
  const content = useContent();
  const savedItems = getSavedItems(content, saved);
  const followTopics = content.followTopics;
  const followedTopics = following.filter((id) => followTopics.some((topic) => topic.id === id)).length;
  const [user, setUser] = useState(undefined);
  useEffect(() => watchUser(setUser), []);
  const authed = user && !user.isAnonymous;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenMasthead label="you" />
      <View style={styles.idcard}>
        <View style={styles.avatar}><I.User size={24} color={colors.dim} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.idName}>Cricket fan</Text>
          <Text style={styles.idMeta}>{authed ? user.email || 'Signed-in account' : `Following ${followedTopics} current ${followedTopics === 1 ? 'topic' : 'topics'} · this device`}</Text>
        </View>
        <Pressable style={styles.authBtn} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.authBtnText}>{authed ? 'Manage' : 'Continue'}</Text>
        </Pressable>
      </View>

      <View>
        <SectionHead title="Saved records" right={(
          <Pressable onPress={() => navigation.navigate('Saved')} hitSlop={6}>
            <Text style={styles.seclink}>{savedItems.length ? `${savedItems.length} saved →` : 'Open →'}</Text>
          </Pressable>
        )} />
        {savedItems.length ? (
          <View style={styles.savedList}>
            {savedItems.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.savedRow}>
                {item.missing ? (
                  <View style={styles.savedMain}><Text style={styles.savedTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.savedMeta} numberOfLines={1}>{item.meta}</Text></View>
                ) : (
                  <Pressable style={styles.savedMain} onPress={() => openRecord(item.layer)}>
                    <Text style={styles.savedTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.savedMeta} numberOfLines={1}>{item.meta}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => prefs.toggleSaved(item.id)} hitSlop={6}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Pressable style={styles.emptySaved} onPress={() => navigation.navigate('Saved')}>
            <I.Bookmark size={18} color={colors.dim} />
            <View style={{ flex: 1 }}>
              <Text style={styles.savedTitle}>No saved records yet</Text>
              <Text style={styles.savedMeta}>Save a fixture, result, or event to find it here.</Text>
            </View>
            <I.Chevron size={15} color={colors.faint} />
          </Pressable>
        )}
      </View>

      <View>
        <SectionHead title="Your teams" />
        {followTopics.length || customFollows.length ? (
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
            {customFollows.map((name) => (
              <Pressable key={name} accessibilityRole="button" onPress={() => prefs.removeCustomFollow(name)} style={[styles.teamPill, styles.teamPillOn]}>
                <View style={[styles.ind, styles.indOn]} />
                <Text style={[styles.teamPillText, styles.teamPillTextOn]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        ) : <Text style={styles.emptyCompact}>{content.loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available to follow yet.'}</Text>}
        {followTopics.length > 0 && <Text style={styles.followcount}>{followedTopics} of {followTopics.length} followed{customFollows.length ? ` · ${customFollows.length} custom` : ''}</Text>}
      </View>

      <View>
        <SectionHead title="Settings" />
        <View style={styles.setrow}><Text style={styles.sl}>Time zone</Text><Text style={styles.sr}>Nepal (NPT)</Text></View>
        <View style={styles.setrow}><Text style={styles.sl}>Language</Text><Text style={styles.sr}>English</Text></View>
        <View style={styles.setrow}><Text style={styles.sl}>Preferences</Text><Text style={styles.sr}>{synced ? 'Synced' : 'Saved on this device'}</Text></View>
      </View>

      <View style={styles.foot}>
        <Text style={styles.footTag}>Your cricket, closer.</Text>
        <Text style={styles.footSmall}>made for nepali fans</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { paddingHorizontal: 20, paddingBottom: 112 },
  seclink: { color: colors.crimsonText, fontSize: 12.5 },
  idcard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 14, marginTop: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  idName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  idMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  authBtn: { borderWidth: 1, borderColor: colors.crimson, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7 },
  authBtnText: { color: colors.crimsonText, fontSize: 12.5, fontWeight: '600' },
  savedList: { gap: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 12 },
  savedMain: { flex: 1, gap: 2 },
  savedTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  savedMeta: { color: colors.muted, fontSize: 11.5 },
  removeText: { color: colors.crimsonText, fontSize: 12 },
  emptySaved: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, padding: 14 },
  teams: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.hairline, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: colors.surface },
  teamPillOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  ind: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  indOn: { backgroundColor: colors.crimson },
  teamPillText: { color: colors.muted, fontSize: 12.5 },
  teamPillTextOn: { color: colors.text },
  followcount: { color: colors.faint, fontSize: 11, marginTop: 8 },
  emptyCompact: { color: colors.muted, fontSize: 13, paddingVertical: 6 },
  setrow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  sl: { color: colors.text2, fontSize: 13.5 },
  sr: { color: colors.faint, fontSize: 12.5 },
  foot: { alignItems: 'center', gap: 3, marginTop: 26 },
  footTag: { color: colors.muted, fontSize: 12.5 },
  footSmall: { color: colors.faint, fontSize: 10.5, letterSpacing: 1 },
});
