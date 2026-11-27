// Font loading — PT Serif is the closest openly-licensed match to the agreed
// web stack (Iowan Old Style / Palatino / Georgia). Loaded remotely at
// startup; falls back to platform serifs when offline (theme.js defaults).
import { useFonts } from 'expo-font';
import { fonts } from '../theme.js';

const PTSERIF_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/ptserif';

export const FONT_SOURCES = {
  PTSerif: `${PTSERIF_BASE}/PT_Serif-Web-Regular.ttf`,
  'PTSerif-Bold': `${PTSERIF_BASE}/PT_Serif-Web-Bold.ttf`,
  'PTSerif-Italic': `${PTSERIF_BASE}/PT_Serif-Web-Italic.ttf`,
};

// Swap the theme families for the loaded ones. Safe to call more than once.
export function applyLoadedFamilies() {
  fonts.serif = 'PTSerif';
  fonts.serifBold = 'PTSerif-Bold';
  fonts.serifItalic = 'PTSerif-Italic';
}

// [loaded, error] — callers render once `loaded` is true and should call
// applyLoadedFamilies() before mounting the shell.
export function useAppFonts() {
  return useFonts(FONT_SOURCES);
}
