import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Easing,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import GradientButton from '../components/GradientButton';
import { colors, fonts, radii } from '../theme/colors';

const STEPS = 4;
const CODE_LENGTH = 6;

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

export interface VerifyCodeFormRef {
  playIn: () => void;
  playOut: (onDone: () => void) => void;
}

interface VerifyCodeFormProps {
  email: string;
  expiresInSeconds?: number;
  onBack: () => void;
  onVerified: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

const VerifyCodeForm = forwardRef<VerifyCodeFormRef, VerifyCodeFormProps>(function VerifyCodeForm(
  { email, expiresInSeconds = 300, onBack, onVerified, onResend },
  ref
) {
  const anims = useRef([...Array(STEPS)].map(() => new Animated.Value(0))).current;
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  const boxRefs = useRef<Array<TextInput | null>>([]);

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

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft <= 0]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const setDigit = (index: number, text: string) => {
    const sanitized = text.replace(/\D/g, '');
    if (sanitized.length > 1) {
      const pasted = sanitized.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      pasted.forEach((char, pos) => {
        next[pos] = char;
      });
      setDigits(next);
      if (error) setError(undefined);
      boxRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
      return;
    }

    setDigits((prev) => {
      const next = prev.slice();
      next[index] = sanitized;
      return next;
    });
    if (error) setError(undefined);
    if (sanitized && index < CODE_LENGTH - 1) boxRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const next = prev.slice();
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        setDigits((prev) => {
          const next = prev.slice();
          next[index - 1] = '';
          return next;
        });
        boxRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const codeValue = digits.join('');
    if (codeValue.length < CODE_LENGTH) return setError('Enter the full 6-digit code');
    setError(undefined);
    setLoading(true);
    try {
      const isValid = await Promise.resolve({ ok: true, valid: true });
      if (!isValid.ok || !isValid.valid) {
        throw new Error('Invalid or expired code');
      }
      await onVerified(codeValue);
    } catch {
      setError('Unable to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResend();
      setDigits(Array(CODE_LENGTH).fill(''));
      setError(undefined);
      setSecondsLeft(expiresInSeconds);
    } catch {
      setError('Unable to resend code. Please try again.');
    }
  };

  return (
    <View style={styles.form}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Reveal anim={anims[0]}>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.subtext}>
          We sent a 6-digit code to <Text style={styles.emailText}>{email}</Text>. Enter it below to continue.
        </Text>
      </Reveal>

      <Reveal anim={anims[1]} style={styles.formSpacing}>
        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { boxRefs.current[i] = r; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null, error ? styles.otpBoxError : null]}
              value={digit}
              onChangeText={(t) => setDigit(i, t)}
              onKeyPress={(e) => handleKeyPress(i, e)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              selectTextOnFocus
            />
          ))}
        </View>
        {error ? (
          <Text style={styles.errorText}>⚠ {error}</Text>
        ) : (
          <Text style={styles.timerText}>
            Code expires in <Text style={styles.timerValue}>{timeLabel}</Text>
          </Text>
        )}
      </Reveal>

      <Reveal anim={anims[2]}>
        <GradientButton label="Verify" onPress={handleVerify} loading={loading} style={styles.ctaSpacing} />
      </Reveal>

      <Reveal anim={anims[3]} style={styles.switchRow}>
        <Text style={styles.switchText}>Didn't get the code? </Text>
        <TouchableOpacity onPress={handleResend} disabled={secondsLeft > 0}>
          <Text style={[styles.link, secondsLeft > 0 && styles.linkDisabled]}>Resend</Text>
        </TouchableOpacity>
      </Reveal>
    </View>
  );
});

export default VerifyCodeForm;

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
  emailText: { fontFamily: fonts.button, color: colors.textPrimary },
  formSpacing: { marginTop: 4, marginBottom: 24 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: radii.medium,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otpBoxFilled: { borderColor: colors.accentSolid },
  otpBoxError: { borderColor: colors.danger },
  timerText: { fontSize: 13, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 12, textAlign: 'center' },
  timerValue: { fontFamily: fonts.button, color: '#D97706' },
  errorText: { fontSize: 12, fontFamily: fonts.body, color: colors.danger, marginTop: 12, textAlign: 'center', fontWeight: '600' },
  ctaSpacing: { marginTop: 4, marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
  linkDisabled: { color: colors.textTertiary },
});
