// Four-step onboarding — identical flow and copy to the web app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme.js';
import * as I from './Icons.js';
import CueMark from './CueMark.js';
import AuthControls from './AuthControls.js';
import { useContent } from '../lib/content.js';
import { watchUser } from '../lib/firebase.js';

const DONE_KEY = 'wp.onboarded';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const roman = (index) => ROMAN[index] || String(index + 1);

const FEATURES = [
  'Live scores, double-verified',
  'Every fixture, in Nepal time',
  'Ask Cue — matches and fixtures',
];

async function readOnboarded() {
  try {
    if (await AsyncStorage.getItem(DONE_KEY)) return false;
    return !(await AsyncStorage.getItem('wp.prefs'));
  } catch {
    return false;
  }
}

export function useNeedsOnboarding() {
  const [needs, setNeeds] = useState(null);
  useEffect(() => {
    readOnboarded().then(setNeeds);
  }, []);
  return [needs === null ? false : needs, () => setNeeds(false)];
}

function markDone() {
  AsyncStorage.setItem(DONE_KEY, '1').catch(() => {});
}

function todayStamp() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function Onboarding({ prefs, onDone }) {
  const [step, setStep] = useState(0);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [user, setUser] = useState(null);
  const { followTopics, loadState } = useContent();
  const customFollows = prefs.customFollows || [];
  const followedTopics = prefs.following.filter((id) => followTopics.some((topic) => topic.id === id)).length;
  const followCount = followedTopics + customFollows.length;
  const insets = useSafeAreaInsets();

  useEffect(() => watchUser(setUser), []);

  const finish = () => {
    markDone();
    onDone();
  };
  const commitOther = () => {
    const value = otherText.trim().slice(0, 40);
    if (!value) return;
    prefs.addCustomFollow(value);
    setOtherText('');
  };
  const next = () => {
    if (step === 1) commitOther();
    if (step < 3) setStep(step + 1);
    else finish();
  };
  const tileCount = followTopics.length + customFollows.length;
  const ctaDisabled = step === 1 && (loadState === 'loading' || (followTopics.length > 0 && followCount === 0));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }]} accessibilityLabel="Welcome to willowPoint">
      <View style={styles.top}>
        <View style={styles.topLeft}>
          {step === 0
            ? <Text style={styles.date}>{todayStamp()}</Text>
            : <Image source={require('../../assets/logo-light.png')} style={styles.obLogo} resizeMode="contain" />}
        </View>
        {step > 0 && (
          <Pressable accessibilityLabel="Back" onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body} key={step}>
        {step === 0 && (
          <View>
            <Image source={require('../../assets/logo-light.png')} style={styles.obMark} resizeMode="contain" />
            <Text style={styles.title}>Namaskar<Text style={styles.dot}>.</Text></Text>
            <Text style={styles.sub}>Welcome to willowPoint</Text>
            <View style={styles.features}>
              {FEATURES.map((text, index) => (
                <View key={text} style={styles.featureRow}>
                  <Text style={styles.num}>{roman(index)}</Text>
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pick your <Text style={styles.span}>cricket</Text></Text>
            <Text style={styles.sub}>Follow the cricket you care about.</Text>
            {followTopics.length || customFollows.length ? (
              <View style={styles.tiles}>
                {followTopics.map((item, index) => {
                  const on = prefs.following.includes(item.id);
                  return (
                    <Pressable key={item.id} accessibilityRole="button" onPress={() => prefs.toggleFollow(item.id)} style={[styles.tile, on && styles.tileOn]}>
                      <Text style={styles.numl}>{roman(index)}</Text>
                      <View style={styles.tileText}>
                        <Text style={[styles.tileTitle, on && styles.tileTitleOn]}>{item.name}</Text>
                        {item.kind ? <Text style={styles.tileSmall}>{item.kind}</Text> : null}
                      </View>
                      <View style={[styles.check, on && styles.checkOn]}>{on ? <I.Check size={13} color={colors.crimsonText} sw={2.4} /> : null}</View>
                    </Pressable>
                  );
                })}
                {customFollows.map((name, index) => (
                  <Pressable key={name} accessibilityRole="button" onPress={() => prefs.removeCustomFollow(name)} style={[styles.tile, styles.tileOn]}>
                    <Text style={styles.numl}>{roman(followTopics.length + index)}</Text>
                    <View style={styles.tileText}>
                      <Text style={[styles.tileTitle, styles.tileTitleOn]}>{name}</Text>
                      <Text style={styles.tileSmall}>your pick</Text>
                    </View>
                    <View style={[styles.check, styles.checkOn]}><I.Check size={13} color={colors.crimsonText} sw={2.4} /></View>
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" onPress={() => setOtherOpen(!otherOpen)} style={[styles.tile, !!otherText.trim() && styles.tileOn]}>
                  <Text style={styles.numl}>{roman(tileCount)}</Text>
                  <View style={styles.tileText}>
                    <Text style={styles.tileTitle}>Other</Text>
                    <Text style={styles.tileSmall}>anything else — cue sorts it</Text>
                  </View>
                  <View style={[styles.check, !!otherText.trim() && styles.checkOn]}>{otherText.trim() ? <I.Check size={13} color={colors.crimsonText} sw={2.4} /> : null}</View>
                </Pressable>
                {otherOpen && (
                  <TextInput
                    style={styles.otherInput}
                    value={otherText}
                    maxLength={40}
                    autoCapitalize="none"
                    placeholder="e.g. India · The Hundred · BPL"
                    placeholderTextColor={colors.faint}
                    onChangeText={setOtherText}
                  />
                )}
              </View>
            ) : (
              <Text style={styles.empty}>{loadState === 'loading' ? 'Finding current cricket topics…' : 'No current topics are available. You can continue and follow them after the next verified refresh.'}</Text>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Sign <Text style={styles.span}>in</Text></Text>
            <Text style={styles.sub}>Sync your follows, saved matches and Cue chats across devices.</Text>
            <AuthControls onSuccess={() => setStep(3)} compact />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>You’re <Text style={styles.span}>all set</Text></Text>
            <Text style={styles.sub}>Your picks shape what you follow. Change them any time in Profile.</Text>
            <View style={styles.card}>
              {user && !user.isAnonymous && (
                <View style={styles.row}>
                  <I.User size={17} color={colors.text2} />
                  <View style={styles.rowTx}>
                    <Text style={styles.rowB}>{user.email || 'Signed in'}</Text>
                    <Text style={styles.rowS}>follows sync across devices</Text>
                  </View>
                </View>
              )}
              <View style={styles.row}>
                <I.Check size={17} color={colors.text2} />
                <View style={styles.rowTx}>
                  <Text style={styles.rowB}>Following {followCount} {followCount === 1 ? 'topic' : 'topics'}</Text>
                  <Text style={styles.rowS}>See them in Discover and Profile</Text>
                </View>
              </View>
              <View style={styles.row}>
                <I.Globe size={17} color={colors.text2} />
                <View style={styles.rowTx}>
                  <Text style={styles.rowB}>Time zone</Text>
                  <Text style={styles.rowS}>All match times shown in</Text>
                </View>
                <Text style={styles.val}>Nepal (NPT)</Text>
              </View>
              {customFollows.map((name) => (
                <View key={name} style={styles.row}>
                  <CueMark size={17} />
                  <View style={styles.rowTx}>
                    <Text style={styles.rowB}>Cue logged “{name}” as a follow</Text>
                    <Text style={styles.rowS}>parsed from your input</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.foot}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((index) => <View key={index} style={[styles.dotSeg, index === step && styles.dotOn]} />)}
        </View>
        {step === 2 ? (
          <Pressable onPress={() => setStep(3)} style={styles.guestBtn}>
            <Text style={styles.guestText}>Continue as guest</Text>
          </Pressable>
        ) : (
          <Pressable onPress={next} disabled={ctaDisabled} style={[styles.cta, ctaDisabled && styles.disabled]}>
            <Text style={styles.ctaText}>{step === 0 ? 'Get started' : step === 1 ? 'Continue' : 'Let’s go'}</Text>
            <I.ArrowUp size={15} color="#FFF" sw={2} style={{ transform: [{ rotate: '90deg' }] }} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.canvas, paddingHorizontal: 24, zIndex: 30 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 34 },
  topLeft: { justifyContent: 'center' },
  date: { color: colors.faint, fontSize: 9.5, letterSpacing: 2, fontFamily: type.mono },
  obLogo: { height: 19, width: 110 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text2, fontSize: 14 },
  body: { flex: 1, paddingTop: 18 },
  obMark: { height: 68, width: 220, marginBottom: 26, alignSelf: 'flex-start' },
  title: { color: colors.text, fontSize: 34, letterSpacing: 0.3, marginBottom: 8 },
  dot: { color: colors.crimson },
  span: { color: colors.crimsonText },
  sub: { color: colors.muted, fontSize: 14, maxWidth: 300, marginBottom: 36 },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  num: { color: colors.faint, fontSize: 14, fontFamily: type.serif, minWidth: 30 },
  numl: { color: colors.faint, fontSize: 12, fontFamily: type.serif, minWidth: 26 },
  featureText: { color: colors.text2, fontSize: 13.5 },
  tiles: { gap: 3, marginTop: 4 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11.5, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tileOn: { borderBottomColor: '#3A2326' },
  tileText: { flex: 1 },
  tileTitle: { color: colors.dim, fontSize: 15.5, fontWeight: '600' },
  tileTitleOn: { color: colors.text },
  tileSmall: { color: colors.faint, fontSize: 11, marginTop: 1 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: colors.crimson, backgroundColor: '#221114' },
  otherInput: { marginLeft: 39, borderBottomWidth: 1, borderBottomColor: colors.crimson, color: colors.text, fontSize: 14, paddingVertical: 8, width: '100%' },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTx: { flex: 1 },
  rowB: { color: colors.text, fontSize: 13, fontWeight: '500' },
  rowS: { color: colors.faint, fontSize: 11, marginTop: 1 },
  val: { color: colors.faint, fontSize: 10, fontFamily: type.mono, letterSpacing: 1 },
  foot: { alignItems: 'center', gap: 14 },
  dots: { flexDirection: 'row', gap: 6 },
  dotSeg: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface2 },
  dotOn: { backgroundColor: colors.crimson },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', backgroundColor: colors.crimson, borderRadius: radius, paddingVertical: 14 },
  ctaText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  guestBtn: { paddingVertical: 8 },
  guestText: { color: colors.muted, fontSize: 13 },
  disabled: { opacity: 0.45 },
});
