import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LucideIcon, Shield, User, Lock } from 'lucide-react-native';
import LoginForm, { LoginFormRef } from './LoginForm';
import SignupForm, { SignupFormRef } from './SignupForm';
import ForgotPasswordForm, { ForgotPasswordFormRef } from './ForgotPasswordForm';
import VerifyCodeForm, { VerifyCodeFormRef } from './VerifyCodeForm';
import BrandMark from '../components/BrandMark';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, radii, fonts } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useTeamStore } from '../context/TeamContext';
import { useAccountsStore } from '../context/AccountsContext';

interface AuthScreenProps {
  navigation?: any;
  route?: any;
  onAuthenticated?: () => void;
}

type Role = 'admin' | 'user' | 'support' | 'readonly';
type Mode = 'login' | 'signup' | 'forgot' | 'verify' | 'resetPassword' | 'pendingApproval' | 'signupBlocked';

const ROLES: { key: Role; title: string; subtitle: string; icon: LucideIcon }[] = [
  { key: 'admin', title: 'ADMIN', subtitle: 'Manage store data', icon: Shield },
  { key: 'user', title: 'USER', subtitle: 'Browse & compare prices', icon: User },
];

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('user');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [pendingUser, setPendingUser] = useState<{ name: string; email: string; role: Role; password: string } | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | undefined>();
  const [resetLoading, setResetLoading] = useState(false);
  // Tracks which flow sent the user to the verify screen, so it knows
  // whether to finish signup or drop back into the password-reset flow.
  const [verifyFlow, setVerifyFlow] = useState<'signup' | 'reset'>('reset');
  const loginRef = useRef<LoginFormRef>(null);
  const signupRef = useRef<SignupFormRef>(null);
  const forgotRef = useRef<ForgotPasswordFormRef>(null);
  const verifyRef = useRef<VerifyCodeFormRef>(null);
  const { setAuth } = useAuthStore();
  const { requestAccess } = useTeamStore();
  const { registerAccount, updateAccountPassword } = useAccountsStore();

  const refFor = (m: Mode) => {
    switch (m) {
      case 'login':
        return loginRef;
      case 'signup':
        return signupRef;
      case 'forgot':
        return forgotRef;
      case 'verify':
        return verifyRef;
      default:
        return null;
    }
  };

  const goTo = (target: Mode) => {
    const activeRef = refFor(mode);
    activeRef?.current?.playOut(() => setMode(target));
    if (!activeRef?.current) setMode(target);
  };

  useEffect(() => {
    const activeRef = refFor(mode);
    const t = setTimeout(() => activeRef?.current?.playIn(), 30);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMarkWrap}>
            <BrandMark height={40} />
          </View>

          {/* Role selector sits between the Pricely logo and the
              "Welcome back" / "Create your account" heading, matching the
              reference layout — persists across the login/signup swap so
              it doesn't reset when switching forms. Hidden for the
              forgot-password/verify flow, which isn't role-specific. */}
          {(mode === 'login' || mode === 'signup') && (
            <View style={styles.roleRow}>
              {ROLES.map(({ key, title, subtitle, icon }) => {
                const active = role === key;
                const Icon = icon;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.roleTab, active && styles.roleTabActive]}
                    onPress={() => setRole(key)}
                    activeOpacity={0.85}
                  >
                    <Icon size={16} color={active ? colors.accentSolid : colors.textTertiary} />
                    <View style={styles.roleTextCol}>
                      <Text style={[styles.roleTitle, active && styles.roleTitleActive]}>{title}</Text>
                      <Text style={styles.roleSubtitle}>{subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {mode === 'login' && (
            <LoginForm
              ref={loginRef}
              role={role}
              onSwitchToSignup={() => goTo('signup')}
              onForgotPassword={() => goTo('forgot')}
              onAuthenticated={onAuthenticated}
            />
          )}
          {mode === 'signup' && (
            <SignupForm
              ref={signupRef}
              role={role}
              onSwitchToLogin={() => goTo('login')}
              onSignedUp={(email, name, password) => {
                setVerifyEmail(email);
                setPendingUser({ name, email, role, password });
                setVerifyFlow('signup');
                goTo('verify');
              }}
            />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordForm
              ref={forgotRef}
              onBack={() => goTo('login')}
              onSwitchToLogin={() => goTo('login')}
              onCodeSent={(email) => {
                setVerifyEmail(email);
                setVerifyFlow('reset');
                goTo('verify');
              }}
            />
          )}
          {mode === 'verify' && (
            <VerifyCodeForm
              ref={verifyRef}
              email={verifyEmail}
              onBack={() => goTo(verifyFlow === 'signup' ? 'signup' : 'forgot')}
              onVerified={async () => {
                if (verifyFlow === 'signup') {
                  if (pendingUser) {
                    if (pendingUser.role === 'admin') {
                      // Self-service admin signups don't get instant access —
                      // they go into the pending-approval queue for an
                      // existing admin to review. Invited members (once the
                      // backend exists) skip this and join directly instead.
                      const requestResult = requestAccess(pendingUser.name, pendingUser.email, 'admin', pendingUser.password);
                      if (requestResult.accepted) {
                        goTo('pendingApproval');
                        return;
                      }
                      // Rejected — stop here. Do NOT fall through to
                      // registerAccount below, or this silently creates a
                      // second account and logs the person straight in,
                      // defeating the whole point of the approval gate.
                      setBlockedReason(
                        requestResult.reason === 'duplicate-pending'
                          ? 'You already have a request pending approval for this email.'
                          : requestResult.reason === 'duplicate-team'
                            ? 'This email is already part of the team — try signing in instead.'
                            : 'An account with this email already exists — try signing in instead.'
                      );
                      goTo('signupBlocked');
                      return;
                    }
                    const account = registerAccount({
                      name: pendingUser.name,
                      email: pendingUser.email,
                      password: pendingUser.password,
                      role: pendingUser.role,
                    });
                    await setAuth({ id: account.id, name: account.name, email: account.email, role: account.role }, 'mock-jwt-token');
                    onAuthenticated?.();
                  }
                } else {
                  goTo('resetPassword');
                }
              }}
              onResend={async () => {
                await new Promise<void>((resolve) => setTimeout(resolve, 250));
              }}
            />
          )}
          {mode === 'pendingApproval' && (
            <View style={styles.resetPasswordCard}>
              <Text style={styles.heading}>Request submitted</Text>
              <Text style={styles.subtext}>
                Your admin access request has been sent to the Pricely team. You'll be able to sign in once an
                existing admin approves it.
              </Text>
              <GradientButton
                label="Back to sign in"
                onPress={() => {
                  setPendingUser(null);
                  goTo('login');
                }}
                style={styles.resetPasswordAction}
              />
            </View>
          )}
          {mode === 'signupBlocked' && (
            <View style={styles.resetPasswordCard}>
              <Text style={styles.heading}>Couldn't submit request</Text>
              <Text style={styles.subtext}>{blockedReason}</Text>
              <GradientButton
                label="Back to sign in"
                onPress={() => {
                  setPendingUser(null);
                  setBlockedReason(undefined);
                  goTo('login');
                }}
                style={styles.resetPasswordAction}
              />
            </View>
          )}
          {mode === 'resetPassword' && (
            <View style={styles.resetPasswordCard}>
              <Text style={styles.heading}>Set a new password</Text>
              <Text style={styles.subtext}>Your code was verified. Choose a new password and sign back in.</Text>
              <FloatingLabelInput
                label="New password"
                icon={Lock}
                value={resetPassword}
                onChangeText={(text) => {
                  setResetPassword(text);
                  if (resetError) setResetError(undefined);
                }}
                secureTextEntry
                error={resetError}
              />
              <FloatingLabelInput
                label="Confirm password"
                icon={Lock}
                value={resetConfirmPassword}
                onChangeText={(text) => {
                  setResetConfirmPassword(text);
                  if (resetError) setResetError(undefined);
                }}
                secureTextEntry
                error={resetError}
              />
              <GradientButton
                label="Reset password"
                onPress={async () => {
                  if (!resetPassword.trim()) {
                    setResetError('Password is required');
                    return;
                  }
                  if (resetPassword.length < 8) {
                    setResetError('Password must be at least 8 characters');
                    return;
                  }
                  if (resetPassword !== resetConfirmPassword) {
                    setResetError('Passwords do not match');
                    return;
                  }
                  setResetError(undefined);
                  setResetLoading(true);
                  try {
                    const updated = await updateAccountPassword(verifyEmail.trim().toLowerCase(), resetPassword.trim());
                    if (!updated) {
                      throw new Error('No matching account found');
                    }
                    setResetPassword('');
                    setResetConfirmPassword('');
                    goTo('login');
                  } catch {
                    setResetError('Unable to reset password. Please try again.');
                  } finally {
                    setResetLoading(false);
                  }
                }}
                loading={resetLoading}
                style={styles.resetPasswordAction}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  brandMarkWrap: { marginBottom: 28 },

  roleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 24,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.medium - 4,
  },
  roleTabActive: { backgroundColor: colors.accentTint },
  roleTextCol: { flexShrink: 1 },
  roleTitle: { fontSize: 11, fontFamily: fonts.button, color: colors.textTertiary, letterSpacing: 0.3 },
  roleTitleActive: { color: colors.accentSolid },
  roleSubtitle: { fontSize: 10, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 1 },
  resetPasswordCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  heading: { fontSize: 28, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 15, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 20, textAlign: 'center' },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
  resetPasswordAction: {
    marginTop: 10,
    width: '100%',
  },
});