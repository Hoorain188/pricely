import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import * as authService from '../services/authService';

// Same rule as SignupForm, so the two screens cannot disagree on what counts.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;'/]).{8,}$/;

interface ChangePasswordScreenProps {
  navigation: { goBack: () => void };
}

export default function ChangePasswordScreen({ navigation }: ChangePasswordScreenProps) {
  const { token, refreshToken } = useAuthStore();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [currentError, setCurrentError] = useState<string | undefined>();
  const [nextError, setNextError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    let bad = false;
    if (!current) {
      setCurrentError('Enter your current password');
      bad = true;
    }
    if (!PASSWORD_RE.test(next)) {
      setNextError('8+ characters, upper & lower case, a number, a symbol');
      bad = true;
    }
    if (next !== confirm) {
      setConfirmError('Passwords do not match');
      bad = true;
    }
    if (current && next && current === next) {
      setNextError('The new password must be different from the current one');
      bad = true;
    }
    if (bad) return;

    if (!token) {
      setFormError('You are not signed in.');
      return;
    }

    setFormError(undefined);
    setLoading(true);
    try {
      await authService.changePassword(
        token,
        { currentPassword: current, newPassword: next },
        refreshToken ?? undefined,
      );
      Alert.alert(
        'Password updated',
        'Your other devices have been signed out.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      setFormError(
        err instanceof authService.ApiError
          ? err.message
          : 'Could not change the password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Change password</Text>
      <Text style={styles.subtext}>
        Your other devices will be signed out. This one stays signed in.
      </Text>

      <View style={styles.field}>
        <FloatingLabelInput
          label="Current password"
          icon={Lock}
          value={current}
          onChangeText={(t: string) => {
            setCurrent(t);
            if (currentError) setCurrentError(undefined);
            if (formError) setFormError(undefined);
          }}
          secureTextEntry
          error={currentError}
        />
      </View>

      <View style={styles.field}>
        <FloatingLabelInput
          label="New password"
          icon={Lock}
          value={next}
          onChangeText={(t: string) => {
            setNext(t);
            if (nextError) setNextError(undefined);
          }}
          secureTextEntry
          hint="8+ characters, upper & lower case, a number, a symbol"
          error={nextError}
        />
      </View>

      <View style={styles.field}>
        <FloatingLabelInput
          label="Confirm new password"
          icon={Lock}
          value={confirm}
          onChangeText={(t: string) => {
            setConfirm(t);
            if (confirmError) setConfirmError(undefined);
          }}
          secureTextEntry
          error={confirmError}
        />
      </View>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <GradientButton
        label="Update password"
        onPress={handleSave}
        loading={loading}
        style={styles.cta}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.headline,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 24,
  },
  field: { marginBottom: 14 },
  formError: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 4,
  },
  cta: { marginTop: 14 },
});