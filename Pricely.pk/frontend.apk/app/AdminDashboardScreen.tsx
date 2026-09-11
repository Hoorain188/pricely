import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Users, Package, Activity, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatTile from '../components/StatTile';
import StatusPill from '../components/StatusPill';
import BarRow from '../components/BarRow';
import { colors, fonts, radii } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useActivityStore } from '../context/ActivityContext';
import { api, timeAgo, toBarRows, ApiError, type DashboardResponse } from './api/client';

interface AdminDashboardScreenProps {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

// Local device time, which is what the person reading it is living in.
function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  // The Scrapers healthy tile scrolls to the section it summarises rather
  // than opening a screen that would repeat the same four rows.
  const scrollRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const { logActivity } = useActivityStore();

  // Support can re-run scrapers too, not just admins — matches the backend,
  // which allows Admin and Support on this action.
  const canRerun = user?.role === 'admin' || user?.role === 'support';

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rerunState, setRerunState] =
    useState<Record<number, { loading: boolean; error?: string }>>({});
  const inFlightReruns = useRef<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setData(await api.dashboard());
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const handleRerun = async (storeId: number, storeName: string) => {
    if (inFlightReruns.current[storeId]) return;

    inFlightReruns.current[storeId] = true;
    setRerunState((prev) => ({ ...prev, [storeId]: { loading: true, error: undefined } }));

    try {
      await api.rerunScraper(storeId);
      setRerunState((prev) => ({ ...prev, [storeId]: { loading: false } }));
      logActivity(`Re-ran the ${storeName} scraper`);
      // Pull fresh status so the row reflects the run that just started.
      await load();
    } catch (error) {
      setRerunState((prev) => ({
        ...prev,
        [storeId]: {
          loading: false,
          error: error instanceof ApiError ? error.message : 'Unable to re-run scraper.',
        },
      }));
    } finally {
      inFlightReruns.current[storeId] = false;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  if (loadError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load the dashboard</Text>
        <Text style={styles.errorBody}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { kpis } = data;
  const trend = (kpi: { changePercent: number | null }) =>
    kpi.changePercent === null
      ? '—'
      : `${kpi.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(kpi.changePercent)}% this week`;

  const failingCount = kpis.scrapersTotal - kpis.scrapersHealthy;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text>
      <Text style={styles.name}>{user?.name ?? 'Admin'}</Text>
      <View style={styles.updatedBadge}>
        <Text style={styles.updatedText}>
          LAST UPDATED {timeAgo(data.lastUpdatedAt).toUpperCase()}
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatTile
          value={kpis.totalUsers.value.toLocaleString()}
          label="Total users"
          icon={Users}
          trend={trend(kpis.totalUsers)}
          onPress={() => navigation.navigate('Users')}
        />
        <StatTile
          value={kpis.productsTracked.value.toLocaleString()}
          label="Products tracked"
          icon={Package}
          trend={trend(kpis.productsTracked)}
          onPress={() => navigation.navigate('AllProducts')}
        />
        <StatTile
          value={`${kpis.scrapersHealthy} / ${kpis.scrapersTotal}`}
          label="Scrapers healthy"
          icon={Activity}
          trend={failingCount > 0 ? `${failingCount} failing` : 'all healthy'}
          warn={failingCount > 0}
          onPress={() => scrollRef.current?.scrollTo({ y: 320, animated: true })}
        />
        <StatTile
          value={kpis.activeAlerts.value.toLocaleString()}
          label="Active alerts"
          icon={Bell}
          trend={trend(kpis.activeAlerts)}
          onPress={() => navigation.navigate('AllAlerts')}
        />
      </View>

      <Text style={styles.sectionTitle}>Scraper health</Text>
      <View style={styles.scraperList}>
        {data.scrapers.map((s) => {
          const rerunStatus = rerunState[s.storeId];
          const isLoading = Boolean(rerunStatus?.loading) || s.status === 'running';
          const isDisabled = isLoading || !s.canRun;

          return (
            <View
              key={s.storeId}
              style={[styles.scraperRow, s.status === 'fail' && styles.scraperRowFail]}
            >
              {/* Ties the list back to the tiles above — same sweep, four pixels of it. */}
              <LinearGradient
                colors={['#0E6B4F', '#16855F', '#1E8F72', '#4AA3D8']}
                locations={[0, 0.45, 0.7, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.scraperStripe}
              />
              <TouchableOpacity
                onPress={() => navigation.navigate('StoreListings', { store: s.storeName })}
              >
                <Text style={styles.scraperName}>{s.storeName}</Text>
                <Text style={styles.scraperMeta}>
                  {timeAgo(s.lastRunAt)} · {s.itemCount.toLocaleString()} items
                </Text>
              </TouchableOpacity>

              <View style={styles.scraperActions}>
                <StatusPill status={s.status === 'running' ? 'ok' : s.status} />
                {canRerun ? (
                  <View style={styles.rerunColumn}>
                    <TouchableOpacity
                      disabled={isDisabled}
                      style={[
                        styles.rerunBtn,
                        s.status === 'fail' && styles.rerunBtnFail,
                        isDisabled && styles.rerunBtnDisabled,
                      ]}
                      onPress={() => void handleRerun(s.storeId, s.storeName)}
                    >
                      <Text style={styles.rerunText}>
                        {isLoading ? 'Running…' : 'Re-run'}
                      </Text>
                    </TouchableOpacity>
                    {rerunStatus?.error ? (
                      <Text style={styles.rerunError}>{rerunStatus.error}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Top searches this week</Text>
      <View style={styles.barList}>
        {data.topSearches.length === 0 ? (
          <Text style={styles.emptyText}>No searches yet this week.</Text>
        ) : (
          toBarRows(data.topSearches).map((r) => (
            <BarRow key={r.label} {...r} color={colors.accentMango} />
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Most-tracked products</Text>
      <View style={styles.barList}>
        {data.mostTracked.length === 0 ? (
          <Text style={styles.emptyText}>No products are being tracked yet.</Text>
        ) : (
          toBarRows(data.mostTracked).map((r) => <BarRow key={r.label} {...r} />)
        )}
      </View>

      <Text style={styles.sectionTitle}>Store click-throughs</Text>
      <View style={styles.barList}>
        {data.storeClicks.length === 0 ? (
          <Text style={styles.emptyText}>No click-throughs recorded yet.</Text>
        ) : (
          toBarRows(data.storeClicks).map((r) => (
            <BarRow key={r.label} {...r} color={colors.adminAccent} />
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent errors</Text>
      <View style={styles.errorList}>
        {data.recentErrors.length === 0 ? (
          <Text style={styles.emptyText}>No errors. Everything is running clean.</Text>
        ) : (
          data.recentErrors.map((e, i) => (
            <View key={`${e.storeName}-${e.occurredAt}-${i}`} style={styles.errorRow}>
              <View style={styles.errorDot} />
              <Text style={styles.errorText}>{e.storeName} — {e.message}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // Titles sat under the status bar. Android reports no safe-area inset here,
  // so the clearance is explicit rather than left to SafeAreaView.
  content: { padding: 20, paddingTop: 52, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.background },
  errorTitle: { fontSize: 15, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  errorBody: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 12.5, fontFamily: fonts.button, color: '#fff' },
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
  emptyText: { fontSize: 12, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', paddingVertical: 8 },
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
    overflow: 'hidden',
    paddingLeft: 17,
  },
  scraperStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
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