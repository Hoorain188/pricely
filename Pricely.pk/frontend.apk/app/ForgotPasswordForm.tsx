import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { Mail, ArrowLeft } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, fonts, radii } from '../theme/colors';
import * as authService from '../services/authService';

const STEPS = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RevealProps {
  anim: Animated.Value;
  children: React.ReactNode;
  style?: ViewStyle;
}

function Reveal({ anim, children, style }: RevealProps) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export interface ForgotPasswordFormRef {
  playIn: () => void;
  playOut: (onDone: () => void) => void;
}

interface ForgotPasswordFormProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
  onCodeSent: (email: string) => void;
}

const ForgotPasswordForm = forwardRef<ForgotPasswordFormRef, ForgotPasswordFormProps>(function ForgotPasswordForm(
  { onBack, onSwitchToLogin, onCodeSent },
  ref
) {
  const anims = useRef([...Array(STEPS)].map(() => new Animated.Value(0))).current;
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    playIn: () => {
      Animated.stagger(
        35,
        anims.map((a) =>
          Animated.timing(a, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )
      ).start();
    },
    playOut: (onDone: () => void) => {
      Animated.stagger(
        15,
        anims.map((a) =>
          Animated.timing(a, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        )
      ).start(onDone);
    },
  }));

  const handleSend = async () => {
    if (!email.trim()) return setError('Email is required');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');

    setError(undefined);
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      // Always advances, even for an unknown email: the server deliberately
      // reports success either way so this screen can't be used to discover
      // which addresses have accounts.
      onCodeSent(email.trim());
    } catch (err) {
      setError(
        err instanceof authService.ApiError ? err.message : 'Could not send the code. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Reveal anim={anims[0]}>
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.subtext}>No worries. Enter the email linked to your account and we'll send you a reset code.</Text>
      </Reveal>

      <Reveal anim={anims[1]} style={styles.formSpacing}>
        <FloatingLabelInput
          label="Email"
          icon={Mail}
          value={email}
          onChangeText={(t: string) => {
            setEmail(t);
            if (error) setError(undefined);
          }}
          keyboardType="email-address"
          error={error}
        />
      </Reveal>

      <Reveal anim={anims[2]}>
        <GradientButton label="Send reset code" onPress={handleSend} loading={loading} style={styles.ctaSpacing} />
      </Reveal>

      <Reveal anim={anims[3]} style={styles.switchRow}>
        <Text style={styles.switchText}>Remember your password? </Text>
        <TouchableOpacity onPress={onSwitchToLogin}>
          <Text style={styles.link}>Sign in</Text>
        </TouchableOpacity>
      </Reveal>
    </View>
  );
});

export default ForgotPasswordForm;

const styles = StyleSheet.create({
  form: { width: '100%' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heading: { fontSize: 28, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 15, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 28 },
  formSpacing: { marginTop: 4 },
  ctaSpacing: { marginTop: 4, marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
});