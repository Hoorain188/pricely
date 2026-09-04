import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';

interface StatTileProps {
  value: string;
  label: string;
  trend?: string;
  warn?: boolean;
  onPress?: () => void;
}

// A wash rather than a solid fill: the number is the point of the tile, and a
// saturated green behind it costs more legibility than it buys attention. The
// warn variant keeps the same shape so a failing scraper still reads as the
// odd one out at a glance.
const WASH = ['#F1F8F4', '#FFFFFF'] as const;
const WASH_WARN = ['#FDF3F3', '#FFFFFF'] as const;

export default function StatTile({ value, label, trend, warn, onPress }: StatTileProps) {
  const content = (
    <LinearGradient
      colors={warn ? WASH_WARN : WASH}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.fill}
    >
      <Text style={[styles.value, warn && styles.valueWarn]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.footer}>
        {trend ? (
          <Text style={[styles.trend, warn ? styles.trendWarn : styles.trendUp]}>{trend}</Text>
        ) : (
          <View />
        )}
        {onPress ? (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap to view</Text>
            <ChevronRight size={12} color={colors.accentSolid} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.tile, warn && styles.tileWarn]}
        onPress={onPress}
        activeOpacity={0.85}
      >
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    // The gradient paints to the rounded edge rather than sitting in a square
    // inside it.
    overflow: 'hidden',
  },
  tileWarn: { borderColor: colors.danger },
  fill: { padding: 14 },

  value: { fontSize: 23, fontFamily: fonts.mono, color: colors.accentSolid },
  valueWarn: { color: colors.danger },
  label: { fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    minHeight: 14,
  },
  trend: { fontSize: 10, fontFamily: fonts.label, flexShrink: 1 },
  trendUp: { color: colors.accentSolid },
  trendWarn: { color: colors.danger },

  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  tapHintText: { fontSize: 10, fontFamily: fonts.label, color: colors.accentSolid },
});