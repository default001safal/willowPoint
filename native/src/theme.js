// willowPoint native theme — same tokens as the web stylesheet.
import { Platform } from 'react-native';

export const colors = {
  canvas: '#0C0C0C',
  bg: '#121212',
  screen: '#121212',
  surface: '#1C1C1C',
  surface2: '#242424',
  border: '#2E2E2E',
  borderStrong: '#404040',
  hairline: '#2E2E2E',
  divider: '#252525',
  text: '#FFFFFF',
  text2: '#D4D4D4',
  muted: '#A3A3A3',
  dim: '#A3A3A3',
  faint: '#6E6E6E',
  accent: '#ED1725',
  accentHover: '#FF4D5A',
  crimson: '#ED1725',
  crimsonText: '#FF6673',
};

export const radius = 16;

// Font families. These start as the closest platform serifs and are swapped for
// the loaded PT Serif families once expo-font finishes (see lib/fonts.js) —
// mirrors the web stack (Iowan Old Style / Palatino / Georgia).
export const fonts = {
  serif: Platform.select({ ios: 'Palatino', android: 'serif', default: 'serif' }),
  serifBold: Platform.select({ ios: 'Palatino-Bold', android: 'serif', default: 'serif' }),
  serifItalic: Platform.select({ ios: 'Palatino-Italic', android: 'serif', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const type = {
  serif: fonts.serif,
  mono: fonts.mono,
};

export const space = (n) => n * 4;
