import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toggle from '../components/Toggle';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useTeamStore } from '../context/TeamContext';

interface AdminSettingsScreenProps {
  navigation: { navigate: (screen: string) => void };
}

export default function AdminSettingsScreen({ navigation }: AdminSettingsScreenProps) {
  const { user, clearAuth } = useAuthStore();
  const { team } = useTeamStore();
  const [newReports, setNewReports] = useState(true);
  const [syncFailures, setSyncFailures] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const settingsStorageKey = user?.id ? `admin-notification-settings:${user.id}` : 'admin-notification-settings:guest';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(settingsStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { newReports?: boolean; syncFailures?: boolean; weeklySummary?: boolean };
          setNewReports(parsed.newReports ?? true);
          setSyncFailures(parsed.syncFailures ?? true);
          setWeeklySummary(parsed.weeklySummary ?? false);
        }
      } catch (error) {
        console.warn('Failed to load notification settings', error);
      } finally {
        setSettingsReady(true);
      }
    };

    void loadSettings();
  }, [settingsStorageKey]);

  const persistSettings = async (next: { newReports: boolean; syncFailures: boolean; weeklySummary: boolean }) => {
    try {
      await AsyncStorage.setItem(settingsStorageKey, JSON.stringify(next));
    } catch (error) {
      console.warn('Failed to save notification settings', error);
    }
  };

  const handleSettingChange = (key: 'newReports' | 'syncFailures' | 'weeklySummary', value: boolean) => {
    const next = {
      newReports,
      syncFailures,
      weeklySummary,
      [key]: value,
    } as { newReports: boolean; syncFailures: boolean; weeklySummary: boolean };

    if (key === 'newReports') setNewReports(value);
    if (key === 'syncFailures') setSyncFailures(value);
    if (key === 'weeklySummary') setWeeklySummary(value);
    void persistSettings(next);
  };

  const initials = (user?.name ?? 'Admin')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name ?? 'Admin'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileRoleWrap}>
            <RolePill role={user?.role === 'user' || !user ? 'admin' : user.role} />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.group}>
        <View style={[styles.row, styles.rowTop]}>
          <Text style={styles.rowLabel}>New reports</Text>
          <Toggle value={newReports} onValueChange={(value) => handleSettingChange('newReports', value)} disabled={!settingsReady} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sync failures</Text>
          <Toggle value={syncFailures} onValueChange={(value) => handleSettingChange('syncFailures', value)} disabled={!settingsReady} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Weekly summary email</Text>
          <Toggle value={weeklySummary} onValueChange={(value) => handleSettingChange('weeklySummary', value)} disabled={!settingsReady} />
        </View>
        <TouchableOpacity style={[styles.row, styles.rowBottom]} onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.rowLabel}>View reports</Text>
          <Text style={styles.rowValue}>Weekly · monthly · yearly ›</Text>
        </TouchableOpacity>
      </View>

      {user?.role !== 'readonly' && (
        <>
          <Text style={styles.sectionTitle}>Team & security</Text>
          <View style={styles.group}>
            <TouchableOpacity style={[styles.row, styles.rowTop]} onPress={() => navigation.navigate('ManageTeamAccess')}>
              <Text style={styles.rowLabel}>Manage team access</Text>
              <Text style={styles.rowValue}>{team.length} member{team.length === 1 ? '' : 's'} · roles set ›</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Two-factor authentication</Text>
              <Text style={styles.rowValueOn}>ON</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ActiveSessions')}>
              <Text style={styles.rowLabel}>Active sessions</Text>
              <Text style={styles.rowValue}>2 devices ›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowBottom]} onPress={() => navigation.navigate('ActivityLog')}>
              <Text style={styles.rowLabel}>Activity log</Text>
              <Text style={styles.rowValue}>Who did what ›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={clearAuth}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 26 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: fonts.headline, fontWeight: '700', fontSize: 17 },
  profileName: { fontSize: 15, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  profileEmail: { fontSize: 11.5, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 1 },
  profileRoleWrap: { marginTop: 5, alignSelf: 'flex-start' },

  sectionTitle: { fontSize: 16, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  group: { borderRadius: radii.medium, overflow: 'hidden', marginBottom: 22 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  rowTop: { borderTopWidth: 1, borderTopLeftRadius: radii.medium, borderTopRightRadius: radii.medium },
  rowBottom: { borderBottomLeftRadius: radii.medium, borderBottomRightRadius: radii.medium },
  rowLabel: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary },
  rowValue: { fontSize: 11.5, fontFamily: fonts.body, color: colors.textTertiary },
  rowValueOn: { fontSize: 11.5, fontFamily: fonts.button, color: colors.accentSolid },

  logoutBtn: {
    borderWidth: 1.3,
    borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: radii.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: { fontSize: 13.5, fontFamily: fonts.button, color: colors.danger },
});
