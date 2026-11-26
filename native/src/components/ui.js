// Shared UI atoms — same structure and labels as the web app.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme.js';
import * as I from './Icons.js';

export function SectionHead({ title, leading, right, style }) {
  return (
    <View style={[styles.sec, style]}>
      <View style={styles.secLeft}>
        {leading}
        <Text style={styles.labelBright}>{title}</Text>
      </View>
      {right ? <View style={styles.secSide}>{right}</View> : null}
    </View>
  );
}

export function SaveButton({ label, saved, onToggle }) {
  return (
    <Pressable
      accessibilityLabel={saved ? `Remove ${label} from saved` : `Save ${label}`}
      accessibilityRole="button"
      onPress={onToggle}
      hitSlop={8}
      style={styles.saveBtn}
    >
      <I.Bookmark size={18} color={saved ? colors.crimsonText : colors.dim} filled={saved} />
    </Pressable>
  );
}

export const Divider = () => <View style={styles.divider} />;

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parts(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return { day: DAY[date.getDay()], date: date.getDate(), month: MON[date.getMonth()] };
}

export function addDays(iso, amount) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + amount);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function relativeDay(iso, today) {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return parts(iso).day;
}

export function ScreenMasthead({ onProfile, label }) {
  return (
    <View>
      <View style={styles.homeTop}>
        <Image source={require('../../assets/logo-light.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="willowPoint" />
        {onProfile ? (
          <Pressable accessibilityLabel="Open your profile" onPress={onProfile} style={styles.avatarBtn}>
            <I.User size={19} color={colors.dim} />
          </Pressable>
        ) : <Text style={styles.label}>{label}</Text>}
      </View>
      <View style={styles.topRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  sec: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  secLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secSide: { flexDirection: 'row', alignItems: 'center' },
  label: { color: colors.faint, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  labelBright: { color: colors.text2, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  saveBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
  homeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 6 },
  logo: { height: 31, width: 140 },
  topRule: { height: 1, backgroundColor: colors.divider, marginTop: 6 },
  avatarBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: 19, color: colors.dim },
});
