import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { ShieldCheck, Copy, Check } from 'lucide-react-native';
import { colors, fonts, radii, shadows } from '../theme/colors';
import LottieBackButton from '../components/Lottiebackbutton';
import FloatingLabelInput from '../components/FloatingLabelInput';
import GradientButton from '../components/GradientButton';
import { api } from './api/client';

/**
 * Turning two-factor authentication on and off.
 *
 * Four states, because setup genuinely has four: off, scanning the QR,
 * writing down the recovery codes, and on. Collapsing the codes step into
 * the others is how people end up with 2FA and no way back in — they are
 * shown once and the server keeps only their hashes.
 */
type Stage = 'loading' | 'off' | 'scan' | 'codes' | 'on';

export default function TwoFactorScreen() {
  const navigation = useNavigation<any>();

  const [stage, setStage] = useState<Stage>('loading');
  const [otpAuthUri, setOtpAuthUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const status = await api.twoFactorStatus();
      setRemaining(status.backupCodesRemaining);
      setStage(status.enabled ? 'on' : 'off');
    } catch {
      setStage('off');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const onBack = () => {
        navigation.goBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [load, navigation]),
  );

  const beginSetup = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const setup = await api.twoFactorSetup();
      setOtpAuthUri(setup.otpAuthUri);
      setSecret(setup.secret);
      setStage('scan');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.twoFactorConfirm(code.trim());
      setBackupCodes(result.backupCodes);
      setCode('');
      // Straight to the codes, never straight to "on" — this is the only
      // time they are ever visible.
      setStage('codes');
    } catch (e: any) {
      setError(e?.message ?? 'That code was not accepted.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.twoFactorDisable(code.trim());
      setCode('');
      setStage('off');
    } catch (e: any) {
      setError(e?.message ?? 'That code was not accepted.');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.twoFactorNewBackupCodes(code.trim());
      setBackupCodes(result.backupCodes);
      setCode('');
      setStage('codes');
    } catch (e: any) {
      setError(e?.message ?? 'That code was not accepted.');
    } finally {
      setBusy(false);
    }
  };

  const shareCodes = async () => {
    try {
      await Share.share({
        message: `Pricely backup codes\n\n${backupCodes.join('\n')}\n\nEach code works once.`,
      });
      setCopied(true);
    } catch {
      // Sharing was dismissed; nothing to report.
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <LottieBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Two-factor authentication</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {stage === 'loading' ? <ActivityIndicator color={colors.accentSolid} style={{ marginTop: 40 }} /> : null}

        {stage === 'off' ? (
          <>
            <View style={styles.iconBadge}>
              <ShieldCheck size={26} color={colors.accentSolid} />
            </View>
            <Text style={styles.title}>Add a second step</Text>
            <Text style={styles.blurb}>
              After your password, sign-in will ask for a 6-digit code from an authenticator app
              such as Google Authenticator. The code is generated on your phone, so it works
              without signal.
            </Text>
            <GradientButton label="Set up" onPress={beginSetup} loading={busy} />
          </>
        ) : null}

        {stage === 'scan' ? (
          <>
            <Text style={styles.title}>Scan this</Text>
            <Text style={styles.blurb}>
              Open your authenticator app and scan the square below.
            </Text>

            <View style={styles.qrBox}>
              {otpAuthUri ? <QRCode value={otpAuthUri} size={200} /> : null}
            </View>

            <Text style={styles.blurb}>
              Can't scan it? Enter this key by hand:
            </Text>
            <Text selectable style={styles.secret}>{secret}</Text>

            <FloatingLabelInput
              label="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
            <GradientButton label="Turn on" onPress={confirm} loading={busy} />
          </>
        ) : null}

        {stage === 'codes' ? (
          <>
            <Text style={styles.title}>Save these codes</Text>
            <Text style={styles.blurb}>
              Each one signs you in once if you lose your phone. This is the only time they are
              shown — we keep no readable copy.
            </Text>

            <View style={styles.codesBox}>
              {backupCodes.map((c) => (
                <Text key={c} selectable style={styles.backupCode}>{c}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.copyRow} onPress={shareCodes}>
              {copied ? <Check size={16} color={colors.accentSolid} /> : <Copy size={16} color={colors.accentSolid} />}
              <Text style={styles.copyText}>{copied ? 'Saved' : 'Save or share these'}</Text>
            </TouchableOpacity>

            <GradientButton
              label="I've saved them"
              onPress={() => {
                setBackupCodes([]);
                setCopied(false);
                load();
              }}
            />
          </>
        ) : null}

        {stage === 'on' ? (
          <>
            <View style={styles.iconBadge}>
              <ShieldCheck size={26} color={colors.accentSolid} />
            </View>
            <Text style={styles.title}>Two-factor is on</Text>
            <Text style={styles.blurb}>
              You have {remaining} backup {remaining === 1 ? 'code' : 'codes'} left.
            </Text>

            <FloatingLabelInput
              label="Current code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            {error ? <Text style={styles.error}>⚠ {error}</Text> : null}

            <GradientButton label="Get new backup codes" onPress={regenerate} loading={busy} />

            <TouchableOpacity style={styles.disableRow} onPress={disable} disabled={busy}>
              <Text style={styles.disableText}>Turn off two-factor</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 15, fontFamily: fonts.label, color: colors.textPrimary },
  body: { padding: 24, paddingBottom: 48 },
  iconBadge: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background, marginBottom: 16,
  },
  title: { fontSize: 20, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 8 },
  blurb: {
    fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary,
    lineHeight: 20, marginBottom: 20,
  },
  qrBox: {
    alignSelf: 'center', padding: 16, backgroundColor: '#FFFFFF',
    borderRadius: radii.large, marginBottom: 20, ...shadows.card,
  },
  secret: {
    fontSize: 14, fontFamily: fonts.mono, color: colors.textPrimary,
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 24,
  },
  codesBox: {
    backgroundColor: colors.background, borderRadius: radii.large,
    padding: 20, marginBottom: 16,
  },
  backupCode: {
    fontSize: 15, fontFamily: fonts.mono, color: colors.textPrimary,
    letterSpacing: 1.5, textAlign: 'center', paddingVertical: 5,
  },
  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  copyText: { fontSize: 13, fontFamily: fonts.label, color: colors.accentSolid },
  error: { fontSize: 12, fontFamily: fonts.body, color: colors.danger, marginBottom: 12 },
  disableRow: { alignItems: 'center', marginTop: 20 },
  disableText: { fontSize: 13, fontFamily: fonts.label, color: colors.danger },
});
