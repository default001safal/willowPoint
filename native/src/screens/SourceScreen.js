import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen.js';
import { colors } from '../theme.js';

// External reference sheet — presented as a modal.
export default function SourceScreen({ navigation, route }) {
  const { source } = route.params || {};
  let host = '';
  let url = null;
  try {
    const parsed = source?.url ? new URL(source.url) : null;
    if (parsed && ['https:', 'http:'].includes(parsed.protocol)) {
      url = parsed.href;
      host = parsed.hostname.replace(/^www\./, '');
    }
  } catch { host = ''; }
  return (
    <Screen title={route.params?.title || 'Source'} eyebrow={url ? 'External reference' : 'Reference'} onClose={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{source?.label || source?.source || host || 'Original publisher'}</Text>
        {host ? <Text style={styles.host}>{host}</Text> : null}
        <Text style={styles.body}>{url ? 'This opens an external publisher. Review the original report before sharing or relying on it.' : 'This reference points to the current app data. No external link was supplied.'}</Text>
        {url ? (
          <Pressable style={styles.primaryLink} onPress={() => Linking.openURL(url)}>
            <Text style={styles.primaryText}>Open original source ↗</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700' },
  host: { color: colors.faint, fontSize: 12.5 },
  body: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  primaryLink: { alignSelf: 'flex-start', marginTop: 4 },
  primaryText: { color: colors.crimsonText, fontSize: 14, fontWeight: '700' },
});
