// Serif-wired Text / TextInput. Every screen imports these instead of the
// react-native primitives so the agreed typeface applies app-wide.
import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { fonts } from '../theme.js';

function resolveFamily(style) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = flat.fontWeight;
  const bold = weight === 'bold' || Number(weight) >= 600;
  if (bold) return fonts.serifBold;
  if (flat.fontStyle === 'italic') return fonts.serifItalic;
  return fonts.serif;
}

export function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: resolveFamily(style) }, style]} />;
}

export function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: resolveFamily(style) }, style]} />;
}

export default Text;
