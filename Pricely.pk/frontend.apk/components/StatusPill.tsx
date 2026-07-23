import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface StatusPillProps {
  status: 'ok' | 'fail';
}

export default function StatusPill({ status }: StatusPillProps) {
  const ok = status === 'ok';
  return (
    <View style={[styles.pill, ok ? styles.pillOk : styles.pillFail]}>
      <View style={[styles.dot, { backgroundColor: ok ? colors.accentSolid : colors.danger }]} />
      <Text style={[styles.label, { color: ok ? colors.accentSolid : colors.danger }]}>
        {ok ? 'OK' : 'FAIL'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 100,
  },
  pillOk: { backgroundColor: colors.accentTint },
  pillFail: { backgroundColor: 'rgba(192,57,43,0.12)' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 10, fontFamily: fonts.mono, fontWeight: '700' },
});
