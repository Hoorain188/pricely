import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { LucideIcon, Shield, User } from 'lucide-react-native';
import LoginForm, { LoginFormRef } from './LoginForm';
import SignupForm, { SignupFormRef } from './SignupForm';
import BrandMark from '../components/BrandMark';
import { colors, radii, fonts } from '../theme/colors';

interface AuthScreenProps {
  navigation?: any;
  route?: any;
  onAuthenticated?: () => void;
}

type Role = 'admin' | 'user';

const ROLES: { key: Role; title: string; subtitle: string; icon: LucideIcon }[] = [
  { key: 'admin', title: 'ADMIN', subtitle: 'Manage store data', icon: Shield },
  { key: 'user', title: 'USER', subtitle: 'Browse & compare prices', icon: User },
];

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<Role>('user');
  const loginRef = useRef<LoginFormRef>(null);
  const signupRef = useRef<SignupFormRef>(null);

  const goTo = (target: 'login' | 'signup') => {
    const leavingRef = mode === 'login' ? loginRef : signupRef;
    leavingRef.current?.playOut(() => setMode(target));
  };

  useEffect(() => {
    const enteringRef = mode === 'login' ? loginRef : signupRef;
    const t = setTimeout(() => enteringRef.current?.playIn(), 30);
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
              it doesn't reset when switching forms. */}
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

          {mode === 'login' ? (
            <LoginForm ref={loginRef} role={role} onSwitchToSignup={() => goTo('signup')} onAuthenticated={onAuthenticated} />
          ) : (
            <SignupForm ref={signupRef} role={role} onSwitchToLogin={() => goTo('login')} onAuthenticated={onAuthenticated} />
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