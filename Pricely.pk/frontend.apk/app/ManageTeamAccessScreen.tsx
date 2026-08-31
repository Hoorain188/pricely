import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { api, ApiError, type ApiTeamMember, type ApiTeamRequest, type Role } from './api/client';

const ROLE_OPTIONS: { key: Role; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'support', label: 'Support' },
  { key: 'readonly', label: 'Read-only' },
];

interface ManageTeamAccessScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string) => void };
}

export default function ManageTeamAccessScreen({ navigation }: ManageTeamAccessScreenProps) {
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';

  const [team, setTeam] = useState<ApiTeamMember[]>([]);
  const [requests, setRequests] = useState<ApiTeamRequest[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [teamRes, requestsRes] = await Promise.all([
        api.team(),
        // Requests are optional; an empty list is fine and should not blank the screen.
        api.teamRequests().catch(() => [] as ApiTeamRequest[]),
      ]);
      setTeam(teamRes.items);
      setRequests(requestsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the team.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleChangeRole = async (member: ApiTeamMember, role: Role) => {
    setEditingId(null);
    if (role === member.role) return;

    setBusyId(member.id);
    setActionError(null);

    try {
      const updated = await api.changeRole(member.id, role);
      setTeam((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      // The server refuses self-edits and demoting the last admin — surface
      // its message rather than a generic one, since it explains the reason.
      setActionError(err instanceof ApiError ? err.message : 'Could not change the role.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = (member: ApiTeamMember) => {
    Alert.alert(
      'Remove from team?',
      `${member.name} will lose admin access. Their activity history is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyId(member.id);
            setActionError(null);
            try {
              await api.removeMember(member.id);
              setTeam((prev) => prev.filter((m) => m.id !== member.id));
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Could not remove the member.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleRequest = async (req: ApiTeamRequest, approve: boolean) => {
    setBusyId(req.id);
    setActionError(null);

    try {
      await (approve ? api.approveRequest(req.id) : api.rejectRequest(req.id));
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (approve) void load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update the request.');
    } finally {
      setBusyId(null);
    }
  };

  // An invite has no user behind it until the code is redeemed, so there is
  // nothing to approve — it can only be cancelled.
  const handleRevokeInvite = async (req: ApiTeamRequest) => {
    setBusyId(req.id);
    setActionError(null);
    try {
      await api.revokeInvite(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not revoke the invite.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.type === 'self_signup');
  const pendingInvites = requests.filter((r) => r.type === 'invite');

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
        <Text style={styles.errorTitle}>Couldn't load the team</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
      }
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Manage team access</Text>
        {canManage && (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => navigation.navigate('InviteMember')}>
            <Text style={styles.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      {pendingRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending requests</Text>
          <View style={styles.list}>
            {pendingRequests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name ?? r.email}</Text>
                  <Text style={styles.rowMeta}>
                    {r.email} · requested {r.requestedRole} access
                  </Text>
                </View>
                {canManage && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={busyId === r.id}
                      onPress={() => void handleRequest(r, true)}
                    >
                      <Check size={15} color="#fff" strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      disabled={busyId === r.id}
                      onPress={() => void handleRequest(r, false)}
                    >
                      <X size={15} color={colors.danger} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending invites</Text>
          <View style={styles.list}>
            {pendingInvites.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.email}</Text>
                  <Text style={styles.rowMeta}>
                    invited as {r.requestedRole}
                    {r.expiresAt
                      ? ` · code expires ${new Date(r.expiresAt).toLocaleDateString()}`
                      : ''}
                  </Text>
                </View>
                {canManage && (
                  <TouchableOpacity
                    disabled={busyId === r.id}
                    onPress={() => void handleRevokeInvite(r)}
                  >
                    <Text style={styles.revokeLink}>Revoke</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Team members</Text>
      <View style={styles.list}>
        {team.map((m) => {
          const busy = busyId === m.id;

          return (
            <View key={m.id} style={[styles.card, busy && styles.cardBusy]}>
              <View style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{m.name}</Text>
                  <Text style={styles.rowMeta}>
                    {m.email}{m.jobTitle ? ` · ${m.jobTitle}` : ' · —'}
                  </Text>
                </View>
                <RolePill role={m.role} />
              </View>

              {canManage &&
                (editingId === m.id ? (
                  <View style={styles.roleOptionsRow}>
                    {ROLE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.roleOption, m.role === opt.key && styles.roleOptionActive]}
                        disabled={busy}
                        onPress={() => void handleChangeRole(m, opt.key)}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            m.role === opt.key && styles.roleOptionTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.cardActions}>
                    <TouchableOpacity disabled={busy} onPress={() => setEditingId(m.id)}>
                      <Text style={styles.changeLink}>
                        {busy ? 'Working…' : 'Change role'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={busy} onPress={() => handleRemove(m)}>
                      <Text style={styles.removeLink}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.background },
  errorTitle: { fontSize: 15, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  errorBody: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 12.5, fontFamily: fonts.button, color: '#fff' },
  actionError: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, marginTop: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  inviteBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 13 },
  inviteBtnText: { fontSize: 11.5, fontFamily: fonts.button, color: '#fff' },
  sectionTitle: { fontSize: 15, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
  list: { gap: 9 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.3,
    borderColor: colors.adminAccent,
    borderRadius: radii.medium,
    padding: 13,
    gap: 10,
  },
  requestActions: { flexDirection: 'row', gap: 8 },
  revokeLink: { fontSize: 12, fontFamily: fonts.button, color: colors.danger },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSolid, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.3, borderColor: 'rgba(220,38,38,0.3)', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  cardBusy: { opacity: 0.6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 13, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  rowMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 11 },
  changeLink: { fontSize: 11.5, fontFamily: fonts.button, color: colors.accentSolid },
  removeLink: { fontSize: 11.5, fontFamily: fonts.button, color: colors.danger },
  roleOptionsRow: { flexDirection: 'row', gap: 7, marginTop: 11 },
  roleOption: { flex: 1, paddingVertical: 8, borderRadius: 9, borderWidth: 1.3, borderColor: colors.border, alignItems: 'center' },
  roleOptionActive: { backgroundColor: colors.accentTint, borderColor: colors.accentSolid },
  roleOptionText: { fontSize: 11, fontFamily: fonts.button, color: colors.textSecondary },
  roleOptionTextActive: { color: colors.accentSolid },
});