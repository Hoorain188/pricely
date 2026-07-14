import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LucideIcon, Shield, User } from 'lucide-react-native';
import LoginForm, { LoginFormRef } from './LoginForm';
import SignupForm, { SignupFormRef } from './SignupForm';
import ForgotPasswordForm, { ForgotPasswordFormRef } from './ForgotPasswordForm';
import VerifyCodeForm, { VerifyCodeFormRef } from './VerifyCodeForm';
import BrandMark from '../components/BrandMark';
import { colors, radii, fonts } from '../theme/colors';

interface AuthScreenProps {
  navigation?: any;
  route?: any;
  onAuthenticated?: () => void;
}

type Role = 'admin' | 'user';
type Mode = 'login' | 'signup' | 'forgot' | 'verify';

const ROLES: { key: Role; title: string; subtitle: string; icon: LucideIcon }[] = [
  { key: 'admin', title: 'ADMIN', subtitle: 'Manage store data', icon: Shield },
  { key: 'user', title: 'USER', subtitle: 'Browse & compare prices', icon: User },
];

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('user');
  const [verifyEmail, setVerifyEmail] = useState('');
  // Tracks which flow sent the user to the verify screen, so it knows
  // whether to finish signup or drop back into the password-reset flow.
  const [verifyFlow, setVerifyFlow] = useState<'signup' | 'reset'>('reset');
  const loginRef = useRef<LoginFormRef>(null);
  const signupRef = useRef<SignupFormRef>(null);
  const forgotRef = useRef<ForgotPasswordFormRef>(null);
  const verifyRef = useRef<VerifyCodeFormRef>(null);

  const refFor = (m: Mode) =>
    m === 'login' ? loginRef : m === 'signup' ? signupRef : m === 'forgot' ? forgotRef : verifyRef;

  const goTo = (target: Mode) => {
    refFor(mode).current?.playOut(() => setMode(target));
  };

  useEffect(() => {
    const t = setTimeout(() => refFor(mode).current?.playIn(), 30);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMarkWrap}>
            <BrandMark size={40} animate />
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
              onSignedUp={(email) => {
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
          {mode === 'verify' && (
            <VerifyCodeForm
              ref={verifyRef}
              email={verifyEmail}
              onBack={() => goTo(verifyFlow === 'signup' ? 'signup' : 'forgot')}
              onVerified={() => (verifyFlow === 'signup' ? onAuthenticated?.() : goTo('login'))}
              onResend={() => {
                // TODO: call your resend-code API here
              }}
            />
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
});