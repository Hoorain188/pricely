import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import StatTile from '../components/StatTile';
import StatusPill from '../components/StatusPill';
import BarRow from '../components/BarRow';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useActivityStore } from '../context/ActivityContext';

interface Scraper {
  store: string;
  status: 'ok' | 'fail';
  lastRun: string;
  items: number;
}

const SCRAPERS: Scraper[] = [
  { store: 'Daraz', status: 'ok', lastRun: '2 min ago', items: 4820 },
  { store: 'Telemart', status: 'fail', lastRun: '5 min ago', items: 0 },
  { store: 'Mega.pk', status: 'ok', lastRun: '3 min ago', items: 3910 },
  { store: 'Amazon', status: 'ok', lastRun: '1 min ago', items: 2140 },
];

const TOP_SEARCHES = [
  { label: 'iPhone 15', value: '2,340', percent: 100 },
  { label: 'Air fryer', value: '1,510', percent: 64 },
  { label: 'Samsung A54', value: '1,120', percent: 48 },
  { label: 'Sneakers', value: '740', percent: 32 },
];

const MOST_TRACKED = [
  { label: 'Redmi Note 13', value: '412', percent: 100 },
  { label: 'Samsung A54', value: '298', percent: 72 },
  { label: 'Air Fryer 5L', value: '201', percent: 49 },
];

const CLICK_THROUGHS = [
  { label: 'Daraz', value: '3,410', percent: 100 },
  { label: 'Telemart', value: '2,150', percent: 63 },
  { label: 'Mega.pk', value: '1,802', percent: 53 },
  { label: 'Amazon', value: '640', percent: 19 },
];


const RECENT_ERRORS = [
  'Telemart — timeout after 30s',
  'Amazon — CAPTCHA detected',
  'Daraz — 2 items failed to parse',
];

interface AdminDashboardScreenProps {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const { user, token } = useAuthStore();
  const { logActivity } = useActivityStore();
  const canRerun = user?.role === 'admin';
  const [rerunState, setRerunState] = useState<Record<string, { loading: boolean; error?: string }>>({});
  const inFlightReruns = useRef<Record<string, AbortController | null>>({});
  const scraperApiUrl = (process.env.EXPO_PUBLIC_SCRAPER_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '').trim();

  const handleRerun = async (store: string) => {
    if (!scraperApiUrl) {
      setRerunState((prev) => ({ ...prev, [store]: { loading: false, error: 'Scraper API is not configured.' } }));
      return;
    }

    if (user?.role !== 'admin' || !token) {
      setRerunState((prev) => ({ ...prev, [store]: { loading: false, error: 'Admin authorization is required.' } }));
      return;
    }

    if (inFlightReruns.current[store]) {
      return;
    }

    const controller = new AbortController();
    inFlightReruns.current[store] = controller;
    setRerunState((prev) => ({ ...prev, [store]: { loading: true, error: undefined } }));

    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${scraperApiUrl.replace(/\/$/, '')}/scrapers/rerun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `rerun:${store}`,
        },
        body: JSON.stringify({ store, requestId: `rerun:${store}` }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setRerunState((prev) => ({ ...prev, [store]: { loading: false, error: undefined } }));
      logActivity(`Re-ran the ${store} scraper`);
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Scraper re-run timed out.'
        : error instanceof Error ? error.message : 'Unable to re-run scraper.';
      setRerunState((prev) => ({ ...prev, [store]: { loading: false, error: message } }));
    } finally {
      clearTimeout(timeoutId);
      if (inFlightReruns.current[store] === controller) {
        inFlightReruns.current[store] = null;
      }
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.name}>{user?.name ?? 'Admin'}</Text>
      <View style={styles.updatedBadge}>
        <Text style={styles.updatedText}>LAST UPDATED 2 MIN AGO</Text>
      </View>

      <View style={styles.statGrid}>
        <StatTile value="1,240" label="Total users" trend="↑ 8% this week" onPress={() => navigation.navigate('Users')} />
        <StatTile value="18,430" label="Products tracked" trend="↑ 3% this week" onPress={() => navigation.navigate('AllProducts')} />
        <StatTile value="3 / 4" label="Scrapers healthy" trend="1 failing" warn />
        <StatTile value="642" label="Active alerts" trend="↑ 12% this week" onPress={() => navigation.navigate('AllAlerts')} />
      </View>

      <Text style={styles.sectionTitle}>Scraper health</Text>
      <View style={styles.scraperList}>
        {SCRAPERS.map((s) => {
          const rerunStatus = rerunState[s.store];
          const isLoading = Boolean(rerunStatus?.loading);
          const isDisabled = !scraperApiUrl || isLoading;

          return (
            <View key={s.store} style={[styles.scraperRow, s.status === 'fail' && styles.scraperRowFail]}>
              <TouchableOpacity onPress={() => navigation.navigate('StoreListings', { store: s.store })}>
                <Text style={styles.scraperName}>{s.store}</Text>
                <Text style={styles.scraperMeta}>{s.lastRun} · {s.items.toLocaleString()} items</Text>
              </TouchableOpacity>
              <View style={styles.scraperActions}>
                <StatusPill status={s.status} />
                {canRerun ? (
                  <View style={styles.rerunColumn}>
                    <TouchableOpacity
                      disabled={isDisabled}
                      style={[styles.rerunBtn, s.status === 'fail' && styles.rerunBtnFail, isDisabled && styles.rerunBtnDisabled]}
                      onPress={() => void handleRerun(s.store)}
                    >
                      <Text style={styles.rerunText}>{isLoading ? 'Starting…' : scraperApiUrl ? 'Re-run' : 'Unavailable'}</Text>
                    </TouchableOpacity>
                    {rerunStatus?.error ? <Text style={styles.rerunError}>{rerunStatus.error}</Text> : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Top searches this week</Text>
      <View style={styles.barList}>
        {TOP_SEARCHES.map((r) => (
          <BarRow key={r.label} {...r} color={colors.accentMango} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Most-tracked products</Text>
      <View style={styles.barList}>
        {MOST_TRACKED.map((r) => (
          <BarRow key={r.label} {...r} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Store click-throughs</Text>
      <View style={styles.barList}>
        {CLICK_THROUGHS.map((r) => (
          <BarRow key={r.label} {...r} color={colors.adminAccent} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent errors</Text>
      <View style={styles.errorList}>
        {RECENT_ERRORS.map((e) => (
          <View key={e} style={styles.errorRow}>
            <View style={styles.errorDot} />
            <Text style={styles.errorText}>{e}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 11, fontFamily: fonts.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  updatedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentTint,
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 18,
  },
  updatedText: { fontSize: 10, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentSolid },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 4 },
  scraperList: { gap: 8, marginBottom: 22 },
  scraperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  scraperRowFail: { borderColor: colors.danger },
  scraperName: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary },
  scraperMeta: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  scraperActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rerunColumn: { alignItems: 'flex-end', gap: 4 },
  rerunBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  rerunBtnFail: { backgroundColor: colors.danger },
  rerunBtnDisabled: { opacity: 0.6 },
  rerunText: { fontSize: 11, fontFamily: fonts.button, color: '#fff' },
  rerunError: { fontSize: 9.5, fontFamily: fonts.body, color: colors.danger, maxWidth: 120, textAlign: 'right' },
  barList: { marginBottom: 22 },
  errorList: { gap: 8, marginBottom: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.danger, marginTop: 6 },
  errorText: { flex: 1, fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary },
});