import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../theme/colors';

interface StatTileProps {
  value: string;
  label: string;
  trend?: string;
  warn?: boolean;
  onPress?: () => void;
}

export default function StatTile({ value, label, trend, warn, onPress }: StatTileProps) {
  const content = (
    <>
      <Text style={[styles.value, warn && styles.valueWarn]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend ? <Text style={[styles.trend, warn ? styles.trendWarn : styles.trendUp]}>{trend}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.tile, warn && styles.tileWarn]} onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.tile, warn && styles.tileWarn]}>{content}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 14,
  },
  tileWarn: { borderColor: colors.danger },
  value: { fontSize: 21, fontFamily: fonts.mono, color: colors.textPrimary },
  valueWarn: { color: colors.danger },
  label: { fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 1 },
  trend: { fontSize: 10, fontFamily: fonts.label, marginTop: 5 },
  trendUp: { color: colors.accentSolid },
  trendWarn: { color: colors.danger },
});
