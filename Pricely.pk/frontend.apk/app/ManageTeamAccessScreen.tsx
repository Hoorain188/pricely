import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import { useTeamStore, TeamRole } from '../context/TeamContext';
import { useAuthStore } from '../context/AuthContext';

const ROLE_OPTIONS: { key: TeamRole; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'support', label: 'Support' },
  { key: 'readonly', label: 'Read-only' },
];

interface ManageTeamAccessScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string) => void };
}

export default function ManageTeamAccessScreen({ navigation }: ManageTeamAccessScreenProps) {
  const { team, pendingRequests, approveRequest, rejectRequest, changeRole, removeMember } = useTeamStore();
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleChangeRole = (id: string, role: TeamRole) => {
    changeRole(id, role);
    setEditingId(null);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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

      {pendingRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending requests</Text>
          <View style={styles.list}>
            {pendingRequests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  <Text style={styles.rowMeta}>
                    {r.email} · requested {r.requestedRole} access · {r.requestedAt}
                  </Text>
                </View>
                {canManage && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approveRequest(r.id)}>
                      <Check size={15} color="#fff" strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(r.id)}>
                      <X size={15} color={colors.danger} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Team members</Text>
      <View style={styles.list}>
        {team.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowMeta}>{m.email} · {m.title}</Text>
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
                      onPress={() => handleChangeRole(m.id, opt.key)}
                    >
                      <Text style={[styles.roleOptionText, m.role === opt.key && styles.roleOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => setEditingId(m.id)}>
                    <Text style={styles.changeLink}>Change role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeMember(m.id)}>
                    <Text style={styles.removeLink}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        ))}
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
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSolid, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.3, borderColor: 'rgba(220,38,38,0.3)', alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
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
