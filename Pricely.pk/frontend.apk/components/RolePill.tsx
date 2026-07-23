import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

type Role = 'admin' | 'support' | 'readonly' | 'customer';

interface RolePillProps {
  role: Role;
}

const ROLE_CONFIG: Record<Role, { label: string; bg: string; text: string }> = {
  admin: { label: 'ADMIN', bg: colors.adminAccent, text: '#fff' },
  support: { label: 'SUPPORT', bg: 'rgba(242,169,59,0.2)', text: '#8A5A12' },
  readonly: { label: 'READ-ONLY', bg: colors.border, text: colors.textSecondary },
  customer: { label: 'CUSTOMER', bg: colors.border, text: colors.textSecondary },
};

export default function RolePill({ role }: RolePillProps) {
  const cfg = ROLE_CONFIG[role];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 100 },
  text: { fontSize: 9.5, fontFamily: fonts.mono, fontWeight: '700', letterSpacing: 0.2 },
});
