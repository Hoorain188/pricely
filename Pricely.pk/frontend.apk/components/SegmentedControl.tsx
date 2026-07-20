import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../theme/colors';

interface SegmentedControlOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function SegmentedControl({ options, activeKey, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.key === activeKey;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.opt, active && styles.optActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium - 2,
    padding: 3,
    gap: 2,
  },
  opt: { flex: 1, paddingVertical: 8, borderRadius: radii.medium - 5, alignItems: 'center' },
  optActive: { backgroundColor: colors.accentTint },
  label: { fontSize: 11.5, fontFamily: fonts.button, color: colors.textTertiary },
  labelActive: { color: colors.accentSolid },
});
