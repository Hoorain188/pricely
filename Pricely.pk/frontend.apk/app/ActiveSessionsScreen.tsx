import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Smartphone, Laptop } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useActivityStore } from '../context/ActivityContext';

interface Session {
  id: string;
  device: string;
  kind: 'phone' | 'laptop';
  location: string;
  lastActive: string;
  current?: boolean;
}

const INITIAL_SESSIONS: Session[] = [
  { id: 's1', device: 'iPhone 15 · Expo Go', kind: 'phone', location: 'Lahore, PK', lastActive: 'Active now', current: true },
  { id: 's2', device: 'MacBook Pro · Chrome', kind: 'laptop', location: 'Lahore, PK', lastActive: '3 hours ago' },
];

interface ActiveSessionsScreenProps {
  navigation: { goBack: () => void };
}

export default function ActiveSessionsScreen({ navigation }: ActiveSessionsScreenProps) {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const { clearAuth } = useAuthStore();
  const { logActivity } = useActivityStore();

  const handleLogOut = (session: Session) => {
    if (session.current) {
      // Logging out "this device" is the same as logging out of the app.
      clearAuth();
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    logActivity(`Signed out ${session.device}`);
    // TODO: call your revoke-session API here
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Active sessions</Text>
      <Text style={styles.subtext}>Devices currently signed in to your admin account.</Text>

      <View style={styles.list}>
        {sessions.map((s) => {
          const Icon = s.kind === 'phone' ? Smartphone : Laptop;
          return (
            <View key={s.id} style={[styles.card, s.current && styles.cardCurrent]}>
              <View style={styles.iconWrap}>
                <Icon size={18} color={s.current ? colors.accentSolid : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.deviceName}>{s.device}</Text>
                  {s.current && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>THIS DEVICE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>{s.location} · {s.lastActive}</Text>
              </View>
              <TouchableOpacity onPress={() => handleLogOut(s)}>
                <Text style={styles.logoutLink}>Log out</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19, marginBottom: 20 },

  list: { gap: 9 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  cardCurrent: { borderColor: colors.accentSolid },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  deviceName: { fontSize: 13, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  currentPill: { backgroundColor: colors.accentTint, borderRadius: 100, paddingVertical: 2, paddingHorizontal: 7 },
  currentPillText: { fontSize: 8.5, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentSolid },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  logoutLink: { fontSize: 11.5, fontFamily: fonts.button, color: colors.danger },
});
