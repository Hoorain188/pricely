import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft, Mail } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, fonts, radii } from '../theme/colors';
import { useActivityStore } from '../context/ActivityContext';
import { useAuthStore } from '../context/AuthContext';
import { api, ApiError, type Role } from './api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: { key: Role; label: string }[] = [
  { key: 'support', label: 'Support' },
  { key: 'readonly', label: 'Read-only' },
  { key: 'admin', label: 'Admin' },
];

interface InviteMemberScreenProps {
  navigation: { goBack: () => void };
}

export default function InviteMemberScreen({ navigation }: InviteMemberScreenProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('support');
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ email: string; role: Role } | null>(null);

  const { logActivity } = useActivityStore();
  const { user } = useAuthStore();
  const canInvite = user?.role === 'admin';

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) return setError('Email is required');
    if (!EMAIL_RE.test(trimmed)) return setError('Enter a valid email address');

    setError(undefined);
    setSending(true);

    try {
      await api.inviteMember(trimmed, role);
      logActivity(`Invited ${trimmed} as ${role}`);
      setSent({ email: trimmed, role });
    } catch (err) {
      // The server rejects duplicates with a clear message ("That email
      // already has an account"), so pass it through instead of masking it.
      setError(err instanceof ApiError ? err.message : 'Unable to send invite.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {!canInvite ? (
        <View style={styles.sentWrap}>
          <Text style={styles.title}>Admins only</Text>
          <Text style={styles.subtext}>Only Admin accounts can invite new team members.</Text>
          <GradientButton label="Go back" onPress={() => navigation.goBack()} style={styles.ctaSpacing} />
        </View>
      ) : sent ? (
        <View style={styles.sentWrap}>
          <Text style={styles.title}>Invite sent</Text>
          <Text style={styles.subtext}>
            {sent.email} will get a link by email to set up their account as{' '}
            {ROLE_OPTIONS.find((r) => r.key === sent.role)?.label}.
          </Text>
          <GradientButton label="Done" onPress={() => navigation.goBack()} style={styles.ctaSpacing} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Invite a team member</Text>
          <Text style={styles.subtext}>
            They'll get an email with a link to set their password and sign in.
          </Text>

          <FloatingLabelInput
            label="Work email"
            icon={Mail}
            value={email}
            onChangeText={(t: string) => {
              setEmail(t);
              if (error) setError(undefined);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <Text style={styles.roleLabel}>Access level</Text>
          <View style={styles.roleOptionsRow}>
            {ROLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.roleOption, role === opt.key && styles.roleOptionActive]}
                onPress={() => setRole(opt.key)}
              >
                <Text style={[styles.roleOptionText, role === opt.key && styles.roleOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <GradientButton
            label="Send invite"
            onPress={() => void handleSend()}
            loading={sending}
            style={styles.ctaSpacing}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  roleLabel: { fontSize: 12, fontFamily: fonts.label, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  roleOptionsRow: { flexDirection: 'row', gap: 8, marginBottom: 26 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.3, borderColor: colors.border, alignItems: 'center' },
  roleOptionActive: { backgroundColor: colors.accentTint, borderColor: colors.accentSolid },
  roleOptionText: { fontSize: 11.5, fontFamily: fonts.button, color: colors.textSecondary },
  roleOptionTextActive: { color: colors.accentSolid },
  ctaSpacing: { marginTop: 4 },
  sentWrap: { paddingTop: 8 },
});