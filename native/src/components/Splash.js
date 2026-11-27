// Launch splash: logo, tagline and a thin loading bar.
// Stays until the first content arrives (at least 900ms so it doesn't flash, at most 2.5s).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Text from './T.js';
import { colors } from '../theme.js';
import { useContent } from '../lib/content.js';

export default function Splash({ onDone }) {
  const { fixtures, stories } = useContent();
  const ready = fixtures.length > 0 || stories.length > 0;
  const [minDone, setMinDone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const min = setTimeout(() => setMinDone(true), 900);
    Animated.timing(progress, { toValue: 1, duration: 2400, useNativeDriver: false }).start();
    return () => clearTimeout(min);
  }, []);

  useEffect(() => {
    if ((ready && minDone) || !ready) {
      const max = setTimeout(onDone, ready && minDone ? 280 : 2500);
      return () => clearTimeout(max);
    }
  }, [ready, minDone, onDone]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root} accessibilityLabel="Loading willowPoint">
      <Image source={require('../../assets/logo-light.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tag}>Your cricket, closer.</Text>
      <View style={styles.bar}><Animated.View style={[styles.barFill, { width }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 40 },
  logo: { height: 52, width: 220 },
  tag: { color: colors.muted, fontSize: 12.5, letterSpacing: 0.5 },
  bar: { width: 120, height: 2, backgroundColor: colors.surface2, borderRadius: 1, overflow: 'hidden', marginTop: 8 },
  barFill: { height: 2, backgroundColor: colors.crimson },
});
