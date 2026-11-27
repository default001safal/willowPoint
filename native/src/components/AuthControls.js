// Sign-in controls: Google (via expo-auth-session, shown only when a native
// Google client ID is configured in app.json extra) and email/password.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text, { TextInput } from './T.js';
import Constants from 'expo-constants';
import { makeRedirectUri, useAuthRequest, useDiscovery, ResponseType } from 'expo-auth-session';
import { colors, radius } from '../theme.js';
import * as I from './Icons.js';
import {
  authErrorMessage,
  createAccountWithEmail,
  signInWithEmail,
  signInWithGoogleIdToken,
} from '../lib/firebase.js';

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || null;

function GoogleButton({ disabled, onPress }) {
  const discovery = useDiscovery('https://accounts.google.com');
  const redirectUri = makeRedirectUri({ scheme: 'willowpoint' });
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: ResponseType.IdToken,
      usePKCE: false,
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (idToken) onPress(Promise.resolve(idToken));
  }, [response]);

  return (
    <Pressable
      style={[styles.googleBtn, disabled && styles.disabled]}
      disabled={disabled || !request}
      onPress={() => promptAsync()}
      accessibilityRole="button"
    >
      <I.GoogleMark size={18} />
      <Text style={styles.googleText}>Continue with Google</Text>
    </Pressable>
  );
}

export default function AuthControls({ onSuccess, compact = false }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onSuccess?.();
    } catch (exception) {
      setError(authErrorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!email.trim() || password.length < 6) return;
    run(() => (mode === 'signin' ? signInWithEmail(email, password) : createAccountWithEmail(email, password)));
  };

  return (
    <View style={[styles.authControls, compact && styles.compact]}>
      {GOOGLE_CLIENT_ID ? (
        <GoogleButton
          disabled={busy}
          onPress={(tokenPromise) => run(async () => signInWithGoogleIdToken(await tokenPromise))}
        />
      ) : null}
      {GOOGLE_CLIENT_ID ? <Text style={styles.or}>or</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.faint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.faint}
        secureTextEntry
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={[styles.emailSubmit, (busy || !email.trim() || password.length < 6) && styles.disabled]}
        disabled={busy || !email.trim() || password.length < 6}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.emailSubmitText}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}</Text>
        {!busy ? <I.ArrowUp size={16} color="#FFF" style={{ transform: [{ rotate: '90deg' }] }} /> : null}
      </Pressable>
      <Pressable
        style={styles.modeBtn}
        disabled={busy}
        onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        accessibilityRole="button"
      >
        <Text style={styles.modeText}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text>
      </Pressable>
      {error ? <Text style={styles.formError} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  authControls: { gap: 10, marginTop: 4 },
  compact: { marginTop: 0 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 13 },
  googleText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  or: { color: colors.faint, fontSize: 11.5, textAlign: 'center' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  emailSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.crimson, borderRadius: radius, paddingVertical: 13 },
  emailSubmitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  modeBtn: { paddingVertical: 6, alignItems: 'center' },
  modeText: { color: colors.crimsonText, fontSize: 12.5 },
  formError: { color: colors.crimsonText, fontSize: 12.5, lineHeight: 17 },
  disabled: { opacity: 0.5 },
});
