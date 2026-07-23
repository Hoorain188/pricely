import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import LottieCheckboxField from '../components/LottieCheckboxField';
import { colors, fonts } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useAccountsStore } from '../context/AccountsContext';

const STEPS = 6;

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

export interface LoginFormRef {
  playIn: () => void;
  playOut: (onDone: () => void) => void;
}

interface LoginFormProps {
  role?: string;
  onSwitchToSignup: () => void;
  onForgotPassword?: () => void;
  onAuthenticated?: () => void;
}

const LoginForm = forwardRef<LoginFormRef, LoginFormProps>(function LoginForm(
  { role, onSwitchToSignup, onForgotPassword, onAuthenticated },
  ref
) {
  const anims = useRef([...Array(STEPS)].map(() => new Animated.Value(0))).current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const { setAuth } = useAuthStore();
  const { findAccount } = useAccountsStore();

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

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';

    if (!agree) next.agree = 'You must accept the Terms & Conditions';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setFormError(undefined);

    const account = findAccount(email, password);
    if (!account) {
      setFormError('No account matches that email and password.');
      return;
    }
    // The ADMIN tab covers every back-office permission level (admin,
    // support, readonly) — only the USER tab is reserved for shoppers.
    const isBackOfficeAccount = account.role !== 'user';
    const wantsBackOffice = role === 'admin';
    if (isBackOfficeAccount !== wantsBackOffice) {
      setFormError('We couldn’t sign you in with those credentials.');
      return;
    }

    await setAuth({ id: account.id, name: account.name, email: account.email, role: account.role }, 'mock-jwt-token');
    onAuthenticated?.();
  };

  return (
    <View style={styles.form}>
      <Reveal anim={anims[0]}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subtext}>Sign in to sync your favorites and price alerts.</Text>
      </Reveal>

      <Reveal anim={anims[1]} style={styles.formSpacing}>
        <FloatingLabelInput
          label="Email"
          icon={Mail}
          value={email}
          onChangeText={(t: string) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
          }}
          keyboardType="email-address"
          error={errors.email}
        />
      </Reveal>

      <Reveal anim={anims[2]}>
        <FloatingLabelInput
          label="Password"
          icon={Lock}
          value={password}
          onChangeText={(t: string) => {
            setPassword(t);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          secureTextEntry
          error={errors.password}
        />
        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={onForgotPassword}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <LottieCheckboxField
          checked={agree}
          onChange={(next: boolean) => {
            setAgree(next);
            if (errors.agree) setErrors((e) => ({ ...e, agree: undefined }));
          }}
          error={!!errors.agree}
          label={
            <>
              I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </>
          }
        />
        {errors.agree ? <Text style={styles.checkboxErrorText}>{errors.agree}</Text> : null}
      </Reveal>

      <Reveal anim={anims[3]}>
        {formError ? <Text style={styles.formErrorText}>⚠ {formError}</Text> : null}
        <GradientButton label="Sign in" onPress={handleLogin} style={styles.ctaSpacing} />
      </Reveal>

      <Reveal anim={anims[4]} style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </Reveal>

      <Reveal anim={anims[5]}>
        <View style={styles.socialRow}>
          <Text style={styles.socialHint}>Social sign-in is coming soon.</Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New here? </Text>
          <TouchableOpacity onPress={onSwitchToSignup}>
            <Text style={styles.link}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </Reveal>
    </View>
  );
});

export default LoginForm;

const styles = StyleSheet.create({
  form: { width: '100%' },
  heading: { fontSize: 28, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 15, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 28 },
  formSpacing: { marginTop: 4 },
  forgotRow: { alignItems: 'flex-end', marginTop: -8, marginBottom: 4 },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
  ctaSpacing: { marginTop: 4, marginBottom: 24 },
  formErrorText: { fontSize: 12, fontFamily: fonts.body, color: colors.danger, fontWeight: '600', marginBottom: 10 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, fontFamily: fonts.label, color: colors.textTertiary, letterSpacing: 0.5, marginHorizontal: 10 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  socialHint: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary },
  checkboxErrorText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 30,
    marginBottom: 14,
  },
});