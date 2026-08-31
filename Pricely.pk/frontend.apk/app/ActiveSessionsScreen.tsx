import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Smartphone, Laptop } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { timeAgo } from './api/client';
import * as authService from '../services/authService';

interface ActiveSessionsScreenProps {
  navigation: { goBack: () => void };
}

/**
 * The API gives us a device string, not a category. Guess an icon from it so
 * the row still reads sensibly; fall back to the laptop glyph.
 */
function isPhone(deviceName: string | null): boolean {
  const n = (deviceName ?? '').toLowerCase();
  return /iphone|ipad|android|pixel|redmi|xiaomi|samsung|galaxy|oppo|vivo|mobile|expo/.test(n);
}

/**
 * Rows whose last_active_at was never set come back as 0001-01-01, which
 * timeAgo renders as "739848 days ago". Treat anything implausible as unknown.
 */
function lastSeen(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t < Date.parse('2000-01-01')) return 'Last active unknown';
  return timeAgo(iso);
}

export default function ActiveSessionsScreen({ navigation }: ActiveSessionsScreenProps) {
  const { token, refreshToken, clearAuth } = useAuthStore();

  const [sessions, setSessions] = useState<authService.SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Not signed in.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      // The server marks one row isCurrentDevice by matching this refresh
      // token — without it, the phone in your hand looks like any other device.
      const data = await authService.getSessions(token, refreshToken ?? undefined);
      setSessions(
        [...data].sort((a, b) => {
          if (a.isCurrentDevice !== b.isCurrentDevice) return a.isCurrentDevice ? -1 : 1;
          return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const doRevoke = async (session: authService.SessionInfo) => {
    if (!token) return;
    setRevokingId(session.id);
    try {
      await authService.revokeSession(token, session.id);
      // Drop it locally rather than refetching — one less round trip, and the
      // row disappears the instant the server confirms.
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      Alert.alert(
        'Could not sign out that device',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogOut = (session: authService.SessionInfo) => {
    if (session.isCurrentDevice) {
      // Signing out "this device" is just signing out of the app.
      Alert.alert('Sign out?', 'This will sign you out on this device.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => clearAuth() },
      ]);
      return;
    }

    const label = session.deviceName ?? 'That device';
    Alert.alert('Sign out device?', `${label} will need to sign in again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => doRevoke(session) },
    ]);
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentSolid} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Couldn't load sessions</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sessions.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>No active sessions</Text>
          <Text style={styles.stateBody}>
            Signed-in devices will appear here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.list}>
        {sessions.map((s) => {
          const Icon = isPhone(s.deviceName) ? Smartphone : Laptop;
          const busy = revokingId === s.id;
          return (
            <View key={s.id} style={[styles.card, s.isCurrentDevice && styles.cardCurrent]}>
              <View style={styles.iconWrap}>
                <Icon
                  size={18}
                  color={s.isCurrentDevice ? colors.accentSolid : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.deviceName}>{s.deviceName ?? 'Unknown device'}</Text>
                  {s.isCurrentDevice && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>THIS DEVICE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>
                  {s.ipAddress ?? 'Unknown IP'} ·{' '}
                  {s.isCurrentDevice ? 'Active now' : lastSeen(s.lastActiveAt)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleLogOut(s)} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Text style={styles.logoutLink}>Log out</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentSolid} />
      }
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.75}
      >
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Active sessions</Text>
      <Text style={styles.subtext}>Devices currently signed in to your admin account.</Text>

      {renderBody()}
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
  title: {
    fontSize: 22,
    fontFamily: fonts.headline,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },

  centered: { paddingTop: 60, alignItems: 'center' },
  stateTitle: {
    fontSize: 15,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  stateBody: {
    fontSize: 12.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.accentSolid,
    borderRadius: radii.medium,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  retryText: { fontSize: 13, fontFamily: fonts.button, fontWeight: '700', color: '#fff' },

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
  deviceName: {
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  currentPill: {
    backgroundColor: colors.accentTint,
    borderRadius: 100,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  currentPillText: {
    fontSize: 8.5,
    fontFamily: fonts.mono,
    fontWeight: '700',
    color: colors.accentSolid,
  },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  logoutLink: { fontSize: 11.5, fontFamily: fonts.button, color: colors.danger },
});