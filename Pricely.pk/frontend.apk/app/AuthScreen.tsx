import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as Device from 'expo-device';
import { LucideIcon, Shield, User, Lock, ArrowLeft } from 'lucide-react-native';
import LoginForm, { LoginFormRef } from './LoginForm';
import SignupForm, { SignupFormRef } from './SignupForm';
import ForgotPasswordForm, { ForgotPasswordFormRef } from './ForgotPasswordForm';
import VerifyCodeForm, { VerifyCodeFormRef } from './VerifyCodeForm';
import AcceptInviteForm, { AcceptInviteFormRef } from './AcceptInviteForm';
import BrandMark from '../components/BrandMark';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, radii, fonts } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import * as authService from '../services/authService';

interface AuthScreenProps {
  navigation?: any;
  route?: any;
  onAuthenticated?: () => void;
}

type Role = 'admin' | 'user' | 'support' | 'readonly';
type Mode = 'login' | 'signup' | 'forgot' | 'verify' | 'resetPassword' | 'pendingApproval' | 'signupBlocked' | 'acceptInvite';

const ROLES: { key: Role; title: string; subtitle: string; icon: LucideIcon }[] = [
  { key: 'admin', title: 'ADMIN', subtitle: 'Manage store data', icon: Shield },
  { key: 'user', title: 'USER', subtitle: 'Browse & compare prices', icon: User },
];

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('user');
  const [verifyEmail, setVerifyEmail] = useState('');
  // The reset flow needs the code again when the new password is submitted:
  // verify-reset-code deliberately checks it without spending it, so the
  // server can re-check and consume it at the actual reset.
  const [verifyCode, setVerifyCode] = useState('');
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
  const acceptInviteRef = useRef<AcceptInviteFormRef>(null);
  const { setAuth } = useAuthStore();

  const refFor = (m: Mode) => {
    switch (m) {
      case 'login':
        return loginRef;
      case 'signup':
        return signupRef;
      case 'forgot':
        return forgotRef;
      case 'acceptInvite':
        return acceptInviteRef;
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
          {mode === 'login' && (
            <TouchableOpacity onPress={() => goTo('acceptInvite')} style={styles.inviteLinkRow}>
              <Text style={styles.inviteLink}>Have an invite code?</Text>
            </TouchableOpacity>
          )}
          {mode === 'signup' && (
            <SignupForm
              ref={signupRef}
              role={role}
              onSwitchToLogin={() => goTo('login')}
              onSignedUp={(email) => {
                // SignupForm has already created the account on the server and
                // triggered the emailed code; nothing is held here.
                setVerifyEmail(email);
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
          {mode === 'acceptInvite' && (
            <AcceptInviteForm
              ref={acceptInviteRef}
              onBack={() => goTo('login')}
              onSwitchToLogin={() => goTo('login')}
              onAccepted={async (result) => {
                await setAuth(result.user, result.accessToken, result.refreshToken);
                onAuthenticated?.();
              }}
            />
          )}
          {mode === 'verify' && (
            <VerifyCodeForm
              ref={verifyRef}
              email={verifyEmail}
              onBack={() => goTo(verifyFlow === 'signup' ? 'signup' : 'forgot')}
              onVerified={async (code: string) => {
                if (verifyFlow === 'signup') {
                  const result = await authService.verifySignup({
                    email: verifyEmail,
                    code,
                    deviceName: `${Device.deviceName ?? Platform.OS} (${Platform.OS})`,
                  });

                  // Shoppers come back signed in. Back-office signups come back
                  // with status 'pending_approval' and no tokens, so which shape
                  // arrived decides where to go — never assume.
                  if (authService.isAuthResponse(result)) {
                    await setAuth(result.user, result.accessToken, result.refreshToken);
                    onAuthenticated?.();
                    return;
                  }
                  goTo('pendingApproval');
                  return;
                }

                // Reset flow: this only checks the code. It is spent later,
                // when the new password is actually submitted.
                await authService.verifyResetCode({ email: verifyEmail, code });
                setVerifyCode(code);
                goTo('resetPassword');
              }}
              onResend={async () => {
                await authService.resendCode({
                  email: verifyEmail,
                  purpose: verifyFlow === 'signup' ? 'Signup' : 'PasswordReset',
                });
              }}
            />
          )}
          {mode === 'pendingApproval' && (
            <View style={styles.resetPasswordCard}>
              <Text style={[styles.heading, styles.centeredText]}>Request submitted</Text>
              <Text style={styles.subtext}>
                Your admin access request has been sent to the Pricely team. You'll be able to sign in once an
                existing admin approves it.
              </Text>
              <GradientButton
                label="Back to sign in"
                onPress={() => goTo('login')}
                style={styles.resetPasswordAction}
              />
            </View>
          )}
          {mode === 'signupBlocked' && (
            <View style={styles.resetPasswordCard}>
              <Text style={[styles.heading, styles.centeredText]}>Couldn't submit request</Text>
              <Text style={styles.subtext}>{blockedReason}</Text>
              <GradientButton
                label="Back to sign in"
                onPress={() => {
                  setBlockedReason(undefined);
                  goTo('login');
                }}
                style={styles.resetPasswordAction}
              />
            </View>
          )}
          {mode === 'resetPassword' && (
            <View style={styles.resetPasswordCard}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setResetPassword('');
                  setResetConfirmPassword('');
                  setResetError(undefined);
                  goTo('login');
                }}
                activeOpacity={0.75}
              >
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.heading, styles.centeredText]}>Set a new password</Text>
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
                    // The code is sent again here — this is the call that
                    // actually spends it, and the server re-checks it rather
                    // than trusting that the earlier screen was passed.
                    await authService.resetPassword({
                      email: verifyEmail,
                      code: verifyCode,
                      newPassword: resetPassword.trim(),
                    });
                    setResetPassword('');
                    setResetConfirmPassword('');
                    setVerifyCode('');
                    goTo('login');
                  } catch (error) {
                    setResetError(
                      error instanceof authService.ApiError
                        ? error.message
                        : 'Unable to reset password. Please try again.',
                    );
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
  inviteLinkRow: { marginTop: 14, alignItems: 'center' },
  inviteLink: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
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
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  centeredText: { textAlign: 'center' },
  heading: { fontSize: 28, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 15, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 20, textAlign: 'center' },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
  resetPasswordAction: {
    marginTop: 10,
    width: '100%',
  },
});