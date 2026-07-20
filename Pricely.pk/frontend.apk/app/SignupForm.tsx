import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { Mail, Lock, User } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import PressExpandButton from '../components/Pressexpandbutton';
import LottieCheckboxField from '../components/LottieCheckboxField';
import { colors, fonts } from '../theme/colors';

const STEPS = 7;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 8+ chars, at least one lowercase, one uppercase, one digit, one symbol —
// a genuinely strong password requirement, not just a length check.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;'/]).{8,}$/;

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

interface SignupFormProps {
  role?: string;
  onSwitchToLogin: () => void;
  onSignedUp: (email: string, name: string) => void;
}

export interface SignupFormRef {
  playIn: () => void;
  playOut: (onDone: () => void) => void;
}

const SignupForm = forwardRef<SignupFormRef, SignupFormProps>(function SignupForm(
  { role, onSwitchToLogin, onSignedUp },
  ref
) {
  const anims = useRef([...Array(STEPS)].map(() => new Animated.Value(0))).current;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

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
    if (!name.trim()) next.name = 'Full name is required';
    else if (name.trim().length < 2) next.name = 'Enter your full name';

    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';
    else if (!PASSWORD_RE.test(password))
      next.password = 'Use 8+ characters with upper & lower case, a number, and a symbol';

    if (!agree) next.agree = 'You must accept the Terms & Conditions';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    // The account is only fully authenticated after the OTP verification succeeds.
    onSignedUp(email.trim(), name.trim());
  };

  return (
    <View style={styles.form}>
      <Reveal anim={anims[0]}>
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subtext}>Start comparing prices across 4 stores in seconds.</Text>
      </Reveal>

      <Reveal anim={anims[1]} style={styles.formSpacing}>
        <FloatingLabelInput
          label="Full name"
          icon={User}
          value={name}
          onChangeText={(t: string) => {
            setName(t);
            if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
          }}
          error={errors.name}
        />
      </Reveal>

      <Reveal anim={anims[2]}>
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

      <Reveal anim={anims[3]}>
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
          hint={errors.password ? undefined : '8+ characters, upper & lower case, a number, a symbol'}
        />

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

      <Reveal anim={anims[4]}>
        <PressExpandButton label="Create account" onPress={handleSignup} style={styles.ctaSpacing} />
      </Reveal>

      <Reveal anim={anims[5]} style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
        <View style={styles.dividerLine} />
      </Reveal>

      <Reveal anim={anims[6]}>
        <View style={styles.socialRow}>
          <Text style={styles.socialHint}>Social sign-up is coming soon.</Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </Reveal>
    </View>
  );
});

export default SignupForm;

const styles = StyleSheet.create({
  form: { width: '100%' },
  heading: { fontSize: 28, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  subtext: { fontSize: 15, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 21, marginBottom: 28 },
  formSpacing: { marginTop: 4 },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
  ctaSpacing: { marginTop: 4, marginBottom: 24 },
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