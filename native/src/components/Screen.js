// Layer-screen scaffold: title, eyebrow, and close — the native PushLayer.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './T.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme.js';
import * as I from './Icons.js';

export default function Screen({ title, eyebrow, onClose, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {onClose ? (
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <I.Plus size={18} color={colors.text2} style={{ transform: [{ rotate: '45deg' }] }} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  eyebrow: { color: colors.crimsonText, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 3 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  footer: { borderTopWidth: 1, borderTopColor: colors.divider, paddingHorizontal: 20, paddingTop: 10 },
});
