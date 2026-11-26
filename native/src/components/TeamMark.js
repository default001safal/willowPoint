// Team marks: bundled national flags and data-driven logos from Firestore
// (config/teamLogos as { "<Team name>": "https://…" }). Unknown teams render no mark.
import React from 'react';
import { Image, View } from 'react-native';
import { useContent } from '../lib/content.js';

const FLAGS = {
  nepal: require('../../assets/flags/nepal.png'),
  'nepal women': require('../../assets/flags/nepal.png'),
  uae: require('../../assets/flags/uae.png'),
  pakistan: require('../../assets/flags/pakistan.png'),
  'pakistan a': require('../../assets/flags/pakistan.png'),
  india: require('../../assets/flags/india.png'),
  'india a': require('../../assets/flags/india.png'),
  italy: require('../../assets/flags/italy.png'),
  england: require('../../assets/flags/england.png'),
  'new zealand': require('../../assets/flags/new-zealand.png'),
  australia: require('../../assets/flags/australia.png'),
  uganda: require('../../assets/flags/uganda.png'),
  jersey: require('../../assets/flags/jersey.png'),
  canada: require('../../assets/flags/canada.png'),
  namibia: require('../../assets/flags/namibia.png'),
  kuwait: require('../../assets/flags/kuwait.png'),
};

const key = (name = '') => name.trim().toLowerCase();

export function useMark(name) {
  const { teamLogos = {} } = useContent();
  const k = key(name);
  const logo = Object.entries(teamLogos).find(([n]) => key(n) === k)?.[1];
  if (logo) return { src: logo, kind: 'logo' };
  if (FLAGS[k]) return { src: FLAGS[k], kind: 'flag' };
  return null;
}

// Decorative: the team name is always shown next to it.
export function TeamMark({ name, size = 24, style }) {
  const mark = useMark(name);
  if (!mark) return null;
  const isFlag = mark.kind === 'flag';
  return (
    <View style={[{ width: isFlag ? Math.round(size * 1.5) : size, height: size, justifyContent: 'center' }, style]}>
      <Image source={typeof mark.src === 'string' ? { uri: mark.src } : mark.src}
        style={isFlag ? { height: size, width: size * 1.4, resizeMode: 'contain' } : { height: size, width: size, resizeMode: 'contain' }}
        accessibilityLabel="" />
    </View>
  );
}

// Marks for both sides of an "A v B" title.
export function MarkPair({ title, size = 14, style }) {
  const [a, b] = String(title || '').split(/\s+v\s+/i);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <TeamMark name={a} size={size} />
      <TeamMark name={b} size={size} style={{ marginLeft: -size / 3 }} />
    </View>
  );
}
