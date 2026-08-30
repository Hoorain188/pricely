import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Toggle from '../components/Toggle';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { api, ApiError, type NotificationPrefs } from './api/client';

interface AdminSettingsScreenProps {
  navigation: { navigate: (screen: string) => void };
}

const DEFAULT_PREFS: NotificationPrefs = {
  newReports: true,
  syncFailures: true,
  weeklySummaryEmail: false,
};

export default function AdminSettingsScreen({ navigation }: AdminSettingsScreenProps) {
  const { user, clearAuth } = useAuthStore();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [prefsRes, teamRes] = await Promise.all([
        api.notificationPrefs(),
        api.team(),
      ]);
      setPrefs(prefsRes);
      setTeamCount(teamRes.totalCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load settings.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /**
   * Preferences live on the server, not on the phone: the backend is what
   * sends these emails, so it has to know the setting. Storing them locally
   * would mean turning a toggle off and still getting the email.
   */
  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };

    // Flip immediately so the switch feels instant, roll back if the save fails.
    setPrefs(next);
    setError(null);

    try {
      setPrefs(await api.updateNotificationPrefs(next));
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof ApiError ? err.message : 'Could not save that setting.');
    }
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

      {error ? <Text style={styles.errorLine}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.group}>
        <View style={[styles.row, styles.rowTop]}>
          <Text style={styles.rowLabel}>New reports</Text>
          <Toggle
            value={prefs.newReports}
            onValueChange={(v) => void handleToggle('newReports', v)}
            disabled={!ready}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sync failures</Text>
          <Toggle
            value={prefs.syncFailures}
            onValueChange={(v) => void handleToggle('syncFailures', v)}
            disabled={!ready}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Weekly summary email</Text>
          <Toggle
            value={prefs.weeklySummaryEmail}
            onValueChange={(v) => void handleToggle('weeklySummaryEmail', v)}
            disabled={!ready}
          />
        </View>
        <TouchableOpacity style={[styles.row, styles.rowBottom]} onPress={() => navigation.navigate('Reports')}>
          <Text style={styles.rowLabel}>View reports</Text>
          <Text style={styles.rowValue}>Weekly · monthly · yearly ›</Text>
        </TouchableOpacity>
      </View>

      {user?.role !== 'readonly' && (
        <>
          <Text style={styles.sectionTitle}>Team &amp; security</Text>
          <View style={styles.group}>
            <TouchableOpacity style={[styles.row, styles.rowTop]} onPress={() => navigation.navigate('ManageTeamAccess')}>
              <Text style={styles.rowLabel}>Manage team access</Text>
              <Text style={styles.rowValue}>
                {teamCount === null
                  ? '…'
                  : `${teamCount} member${teamCount === 1 ? '' : 's'} · roles set`} ›
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChangePassword')}>
              <Text style={styles.rowLabel}>Change password</Text>
              <Text style={styles.rowValue}>Update ›</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Two-factor authentication</Text>
              {/* Not built yet. Saying OFF is honest; saying ON is a lie that
                  makes people think they are protected when they are not. */}
              <Text style={styles.rowValueMuted}>Not set up</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ActiveSessions')}>
              <Text style={styles.rowLabel}>Active sessions</Text>
              <Text style={styles.rowValue}>Manage devices ›</Text>
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
  errorLine: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, marginBottom: 12 },
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
  rowValueMuted: { fontSize: 11.5, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic' },
  logoutBtn: {
    borderWidth: 1.3,
    borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: radii.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: { fontSize: 13.5, fontFamily: fonts.button, color: colors.danger },
});