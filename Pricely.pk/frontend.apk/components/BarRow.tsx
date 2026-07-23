import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface BarRowProps {
  label: string;
  value: string;
  percent: number; // 0-100
  color?: string;
}

export default function BarRow({ label, value, percent, color = colors.accentSolid }: BarRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  label: { width: 92, fontSize: 12, fontFamily: fonts.label, color: colors.textPrimary },
  track: { flex: 1, height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { width: 46, textAlign: 'right', fontSize: 11, fontFamily: fonts.mono, color: colors.textSecondary },
});
