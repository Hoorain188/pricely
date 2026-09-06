import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { fonts, radii } from '../theme/colors';

interface StatTileProps {
  value: string;
  label: string;
  trend?: string;
  warn?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
}

// The same sweep the app's headers use, held green for most of its length so
// the blue only catches the far corner.
const WASH = ['#0E6B4F', '#16855F', '#1E8F72', '#4AA3D8'] as const;
const WASH_STOPS = [0, 0.45, 0.7, 1] as const;

// Amber rather than red for the warn state: a red tile against a green one
// reads as an error in the tile itself, and red barely registers on top of
// this gradient anyway.
const WARN_RING = '#F5A623';
const WARN_TEXT = '#FFE0AE';

export default function StatTile({ value, label, trend, warn, icon: Icon, onPress }: StatTileProps) {
  const content = (
    <LinearGradient
      colors={WASH}
      locations={WASH_STOPS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <View style={styles.topRow}>
        <Text style={styles.value}>{value}</Text>
        {Icon ? <Icon size={18} color="rgba(255,255,255,0.75)" /> : null}
      </View>

      <Text style={styles.label}>{label}</Text>

      <View style={styles.footer}>
        {trend ? (
          <Text style={[styles.trend, warn && styles.trendWarn]} numberOfLines={1}>
            {trend}
          </Text>
        ) : (
          <View />
        )}
        {onPress ? (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap to view</Text>
            <ChevronRight size={12} color="#FFFFFF" strokeWidth={2.5} />
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
    borderRadius: radii.medium,
    // Without this the gradient paints a square behind the rounded corners.
    overflow: 'hidden',
  },
  tileWarn: { borderWidth: 2, borderColor: WARN_RING },
  fill: { padding: 15 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  value: { fontSize: 28, fontFamily: fonts.mono, color: '#FFFFFF' },
  label: { fontSize: 14, fontFamily: fonts.label, fontWeight: '700', color: '#FFFFFF', marginTop: 5, letterSpacing: 0.1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    minHeight: 14,
  },
  trend: { fontSize: 10, fontFamily: fonts.label, color: 'rgba(255,255,255,0.88)', flexShrink: 1 },
  trendWarn: { color: WARN_TEXT },

  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  tapHintText: { fontSize: 10, fontFamily: fonts.label, color: '#FFFFFF' },
});