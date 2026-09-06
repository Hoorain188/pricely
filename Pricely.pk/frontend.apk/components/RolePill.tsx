import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, LifeBuoy, Eye, User, type LucideIcon } from 'lucide-react-native';
import { colors, fonts } from '../theme/colors';

type Role = 'admin' | 'support' | 'readonly' | 'customer';

interface RolePillProps {
  role: Role;
}

// An icon per role, so the four pills are told apart at a glance rather than
// by reading them — shield for authority, life-buoy for help, eye for looking
// without touching.
const ROLE_CONFIG: Record<Role, { label: string; bg: string; text: string; icon: LucideIcon }> = {
  admin: { label: 'ADMIN', bg: colors.adminAccent, text: '#fff', icon: Shield },
  support: { label: 'SUPPORT', bg: 'rgba(242,169,59,0.2)', text: '#8A5A12', icon: LifeBuoy },
  readonly: { label: 'READ-ONLY', bg: colors.border, text: colors.textSecondary, icon: Eye },
  customer: { label: 'CUSTOMER', bg: colors.border, text: colors.textSecondary, icon: User },
};

export default function RolePill({ role }: RolePillProps) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Icon size={11} color={cfg.text} strokeWidth={2.5} />
      <Text style={[styles.text, { color: cfg.text }]}>{cfg.label}</Text>
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
  text: { fontSize: 9.5, fontFamily: fonts.mono, fontWeight: '700', letterSpacing: 0.2 },
});