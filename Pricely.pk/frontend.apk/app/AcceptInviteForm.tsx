import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';
import { KeyRound, User, Lock, ArrowLeft } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, fonts, radii } from '../theme/colors';
import * as authService from '../services/authService';

const STEPS = 6;
// Same rule as SignupForm, so the two screens can't disagree on what counts.
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

export interface AcceptInviteFormRef {
  playIn: () => void;
  playOut: (onDone: () => void) => void;
}

interface AcceptInviteFormProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
  /** Handed the signed-in response so the screen can store tokens. */
  onAccepted: (result: authService.AuthResponse) => void;
}

const AcceptInviteForm = forwardRef<AcceptInviteFormRef, AcceptInviteFormProps>(
  function AcceptInviteForm({ onBack, onSwitchToLogin, onAccepted }, ref) {
    const anims = useRef([...Array(STEPS)].map(() => new Animated.Value(0))).current;

    const [token, setToken] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    const [tokenError, setTokenError] = useState<string | undefined>();
    const [nameError, setNameError] = useState<string | undefined>();
    const [passwordError, setPasswordError] = useState<string | undefined>();
    const [formError, setFormError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);

    useImperativeHandle(ref, () => ({
      playIn: () => {
        Animated.stagger(
          35,
          anims.map((a) =>
            Animated.timing(a, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ).start();
      },
      playOut: (onDone: () => void) => {
        Animated.stagger(
          15,
          anims.map((a) =>
            Animated.timing(a, {
              toValue: 0,
              duration: 180,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ).start(onDone);
      },
    }));

    const handleAccept = async () => {
      // The code is long and usually pasted, so trimming stray whitespace and
      // line breaks matters more here than on the other forms.
      const cleanToken = token.replace(/\s+/g, '');

      let bad = false;
      if (!cleanToken) {
        setTokenError('Paste the invite code from your email');
        bad = true;
      }
      if (!name.trim()) {
        setNameError('Your name is required');
        bad = true;
      }
      if (!PASSWORD_RE.test(password)) {
        setPasswordError('8+ characters, upper & lower case, a number, a symbol');
        bad = true;
      }
      if (bad) return;

      setFormError(undefined);
      setLoading(true);
      try {
        const result = await authService.acceptInvite({
          token: cleanToken,
          name: name.trim(),
          password,
        });
        onAccepted(result);
      } catch (err) {
        setFormError(
          err instanceof authService.ApiError
            ? err.message
            : 'Could not accept the invite. Please try again.',
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
          <Text style={styles.heading}>Accept your invite</Text>
          <Text style={styles.subtext}>
            Paste the code from your invite email, then pick a password. The code expires seven
            days after it was sent.
          </Text>
        </Reveal>

        <Reveal anim={anims[1]} style={styles.formSpacing}>
          <FloatingLabelInput
            label="Invite code"
            icon={KeyRound}
            value={token}
            onChangeText={(t: string) => {
              setToken(t);
              if (tokenError) setTokenError(undefined);
              if (formError) setFormError(undefined);
            }}
            error={tokenError}
          />
        </Reveal>

        <Reveal anim={anims[2]} style={styles.formSpacing}>
          <FloatingLabelInput
            label="Full name"
            icon={User}
            value={name}
            onChangeText={(t: string) => {
              setName(t);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />
        </Reveal>

        <Reveal anim={anims[3]} style={styles.formSpacing}>
          <FloatingLabelInput
            label="Password"
            icon={Lock}
            value={password}
            onChangeText={(t: string) => {
              setPassword(t);
              if (passwordError) setPasswordError(undefined);
            }}
            secureTextEntry
            hint="8+ characters, upper & lower case, a number, a symbol"
            error={passwordError}
          />
        </Reveal>

        {formError ? (
          <Reveal anim={anims[4]}>
            <Text style={styles.formError}>{formError}</Text>
          </Reveal>
        ) : null}

        <Reveal anim={anims[4]}>
          <GradientButton
            label="Join the team"
            onPress={handleAccept}
            loading={loading}
            style={styles.ctaSpacing}
          />
        </Reveal>

        <Reveal anim={anims[5]} style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </Reveal>
      </View>
    );
  },
);

export default AcceptInviteForm;

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
  subtext: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 28,
  },
  formSpacing: { marginTop: 4 },
  formError: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.danger,
    marginTop: 14,
    marginBottom: 2,
  },
  ctaSpacing: { marginTop: 18, marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary },
  link: { color: colors.accentSolid, fontFamily: fonts.button, fontSize: 13 },
});