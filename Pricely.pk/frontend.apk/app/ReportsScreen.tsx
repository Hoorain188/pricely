import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { ArrowLeft, Download } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import StatTile from '../components/StatTile';
import BarRow from '../components/BarRow';
import { colors, fonts, radii } from '../theme/colors';
import {
  api, formatPrice, toBarRows, toMoneyBarRows, toShareBarRows, ApiError,
  type Period, type ReportsResponse,
} from './api/client';

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function buildCsv(period: Period, data: ReportsResponse): string {
  const lines: string[] = [];
  lines.push(`Pricely admin report — ${period}`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push('');
  lines.push('Summary');
  lines.push('Metric,Value');
  lines.push(`Active shoppers,${data.activeShoppers.value}`);
  lines.push(`Saved by shoppers,${data.savedByShoppers.amount}`);
  lines.push('');
  lines.push('Trending searches');
  lines.push('Search,Count');
  data.trendingSearches.forEach((r) => lines.push(`"${r.label}",${r.count}`));
  lines.push('');
  lines.push('Price changes');
  lines.push('Product,From,To,Change %');
  data.priceChanges.forEach((p) =>
    lines.push(`"${p.product}",${p.fromPrice},${p.toPrice},${p.changePercent}`));
  lines.push('');
  lines.push('Average price by store');
  lines.push('Store,Average price');
  data.storeAverages.forEach((s) => lines.push(`"${s.label}",${s.amount}`));
  lines.push('');
  lines.push('Category breakdown');
  lines.push('Category,Clicks');
  data.categories.forEach((c) => lines.push(`"${c.label}",${c.count}`));
  return lines.join('\n');
}

interface ReportsScreenProps {
  navigation: { goBack: () => void };
}

export default function ReportsScreen({ navigation }: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ReportsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    try {
      setError(null);
      setData(await api.reports(p));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Switching period refetches — each window is a different server query,
  // not a filter over data we already hold.
  useEffect(() => {
    setLoading(true);
    void load(period);
  }, [period, load]);

  const handleDownload = async () => {
    if (!data) return;

    setDownloadError(null);
    setDownloading(true);

    try {
      const file = new File(Paths.cache, `pricely-report-${period}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(buildCsv(period, data));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download report',
        });
      } else {
        setDownloadError('Sharing is not available on this device.');
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Unable to generate the report file.');
    } finally {
      setDownloading(false);
    }
  };

  const header = (
    <>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.downloadBtn, (downloading || !data) && styles.btnDisabled]}
          onPress={() => void handleDownload()}
          disabled={downloading || !data}
        >
          <Download size={14} color="#fff" />
          <Text style={styles.downloadBtnText}>{downloading ? 'Preparing…' : 'Download CSV'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtext}>Trends, price movement, and category mix — by time period.</Text>
      {downloadError ? <Text style={styles.errorText}>⚠ {downloadError}</Text> : null}

      <View style={styles.periodRow}>
        {PERIOD_LABELS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodOption, period === p.key && styles.periodOptionActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  if (loading) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {header}
        <ActivityIndicator color={colors.accentSolid} style={styles.spinner} />
      </ScrollView>
    );
  }

  if (error || !data) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {header}
        <Text style={styles.errorTitle}>Couldn't load reports</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => { setLoading(true); void load(period); }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const shoppersTrend =
    data.activeShoppers.changePercent === null
      ? ''
      : ` (${data.activeShoppers.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.activeShoppers.changePercent)}%)`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(period); }} />
      }
    >
      {header}

      <View style={styles.statGrid}>
        <StatTile
          value={`${data.activeShoppers.value.toLocaleString()}${shoppersTrend}`}
          label="Active shoppers"
        />
        <StatTile
          value={formatPrice(data.savedByShoppers.amount, data.savedByShoppers.currency)}
          label="Saved by shoppers"
        />
      </View>

      <Text style={styles.sectionTitle}>Trending searches</Text>
      <View style={styles.barList}>
        {data.trendingSearches.length === 0 ? (
          <Text style={styles.emptyText}>No searches in this period.</Text>
        ) : (
          toBarRows(data.trendingSearches).map((r) => (
            <BarRow key={r.label} {...r} color={colors.accentMango} />
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Price changes</Text>
      <View style={styles.list}>
        {data.priceChanges.length === 0 ? (
          <Text style={styles.emptyText}>No price movement recorded yet.</Text>
        ) : (
          data.priceChanges.map((p) => {
            const dropped = p.changePercent < 0;
            return (
              <View key={p.product} style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceProduct}>{p.product}</Text>
                  <Text style={styles.priceMeta}>
                    {formatPrice(p.fromPrice)} → {formatPrice(p.toPrice)}
                  </Text>
                </View>
                <Text style={[styles.priceChange, dropped ? styles.priceDown : styles.priceUp]}>
                  {dropped ? '▼' : '▲'} {Math.abs(p.changePercent)}%
                </Text>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.sectionTitle}>Average price by store</Text>
      <View style={styles.barList}>
        {data.storeAverages.length === 0 ? (
          <Text style={styles.emptyText}>No listings to average yet.</Text>
        ) : (
          toMoneyBarRows(data.storeAverages).map((r) => <BarRow key={r.label} {...r} />)
        )}
      </View>

      <Text style={styles.sectionTitle}>Category breakdown</Text>
      <View style={styles.barList}>
        {data.categories.length === 0 ? (
          <Text style={styles.emptyText}>No click-throughs in this period.</Text>
        ) : (
          toShareBarRows(data.categories).map((r) => (
            <BarRow key={r.label} {...r} color={colors.adminAccent} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  spinner: { marginTop: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSolid,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  btnDisabled: { opacity: 0.6 },
  downloadBtnText: { fontSize: 11.5, fontFamily: fonts.button, color: '#fff' },
  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19 },
  errorText: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, fontWeight: '600', marginTop: 8 },
  errorTitle: { fontSize: 15, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 6, textAlign: 'center' },
  errorBody: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  retryBtn: { alignSelf: 'center', backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 12.5, fontFamily: fonts.button, color: '#fff' },
  emptyText: { fontSize: 12, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', paddingVertical: 8 },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 3,
    gap: 2,
    marginTop: 16,
    marginBottom: 18,
  },
  periodOption: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  periodOptionActive: { backgroundColor: colors.accentTint },
  periodText: { fontSize: 12, fontFamily: fonts.button, color: colors.textTertiary },
  periodTextActive: { color: colors.accentSolid },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  barList: { marginBottom: 22 },
  list: { gap: 8, marginBottom: 22 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  priceProduct: { fontSize: 12.5, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  priceMeta: { fontSize: 10.5, fontFamily: fonts.mono, color: colors.textTertiary, marginTop: 2 },
  priceChange: { fontSize: 12, fontFamily: fonts.mono, fontWeight: '700' },
  priceDown: { color: colors.accentSolid },
  priceUp: { color: colors.danger },
});