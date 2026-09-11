import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: number;
}

// Colour comes from the name, not at random, so the same person keeps the same
// circle every time the list loads. Muted tints only — these sit next to role
// pills that are already carrying colour.
const TINTS = [
  { bg: '#E3EFE9', fg: '#0E6B4F' },
  { bg: '#E7EEFC', fg: '#274C8F' },
  { bg: '#FBEDD9', fg: '#8A5A12' },
  { bg: '#F1E9F7', fg: '#5B3B7A' },
  { bg: '#FAE7E7', fg: '#8C2A2A' },
  { bg: '#E4F1F4', fg: '#1B6675' },
];

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = (name ?? '').trim() || (email ?? '').trim();
  if (!source) return '?';

  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function Avatar({ name, email, size = 36 }: AvatarProps) {
  const key = (name ?? email ?? '?').toLowerCase();
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  const tint = TINTS[sum % TINTS.length];

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg },
      ]}
    >
      <Text style={[styles.text, { color: tint.fg, fontSize: size * 0.36 }]}>
        {initialsFrom(name, email)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.label, fontWeight: '700' },
});