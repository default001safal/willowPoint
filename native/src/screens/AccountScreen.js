import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen.js';
import AuthControls from '../components/AuthControls.js';
import { colors, radius } from '../theme.js';
import * as I from '../components/Icons.js';
import { watchUser, signOutUser } from '../lib/firebase.js';

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => watchUser(setUser), []);
  const authed = user && !user.isAnonymous;

  return (
    <Screen title="Your account" eyebrow={authed ? 'Signed in' : 'Sync and sign in'} onClose={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.detail}>
        <View style={styles.mark}><I.User size={25} color={colors.dim} /></View>
        <Text style={styles.title}>{authed ? user.email || 'Your account' : 'Keep your cricket with you'}</Text>
        <Text style={styles.lede}>{authed ? 'Your follows and saved records are linked to this account.' : 'Sign in with Google or email to link your follows and saved records. Guest use remains available on this device.'}</Text>
        {authed ? (
          <Pressable style={[styles.secondaryBtn, styles.danger]} onPress={() => navigation.navigate('ConfirmSignOut')}>
            <Text style={[styles.secondaryText, styles.dangerText]}>Sign out</Text>
          </Pressable>
        ) : (
          <>
            <AuthControls compact />
            <Pressable onPress={() => navigation.goBack()} hitSlop={6}>
              <Text style={styles.textAction}>Continue on this device</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

export function ConfirmSignOutScreen({ navigation }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await signOutUser();
      navigation.goBack();
      navigation.goBack();
    } catch (exception) {
      setError(exception.message || 'Could not sign out. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Sign out?" eyebrow="Account decision" onClose={() => navigation.goBack()}>
      <View style={styles.detail}>
        <Text style={styles.lede}>Your saved records and follows stay on this device. Sign in again to access your linked account.</Text>
        {error ? <Text style={styles.formError} accessibilityLiveRegion="polite">{error}</Text> : null}
        <View style={styles.confirmRow}>
          <Pressable style={styles.secondaryBtn} disabled={busy} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, styles.danger]} disabled={busy} onPress={confirm}>
            <Text style={[styles.secondaryText, styles.dangerText]}>{busy ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detail: { padding: 20, gap: 12 },
  mark: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  lede: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  secondaryBtn: { alignItems: 'center', borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12 },
  secondaryText: { color: colors.text2, fontSize: 13.5, fontWeight: '600' },
  danger: { borderColor: '#57202A' },
  dangerText: { color: colors.crimsonText },
  textAction: { color: colors.crimsonText, fontSize: 12.5, textAlign: 'center', paddingVertical: 6 },
  formError: { color: colors.crimsonText, fontSize: 12.5 },
  confirmRow: { flexDirection: 'row', gap: 10 },
});
