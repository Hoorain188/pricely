import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Download } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import StatTile from '../components/StatTile';
import BarRow from '../components/BarRow';
import { colors, fonts, radii } from '../theme/colors';

type Period = 'weekly' | 'monthly' | 'yearly';

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

interface PriceChange {
  product: string;
  from: string;
  to: string;
  changePercent: number; // negative = price dropped
}

interface ReportData {
  usersLabel: string;
  savedLabel: string;
  trending: { label: string; value: string; percent: number }[];
  priceChanges: PriceChange[];
  storeAverages: { label: string; value: string; percent: number }[];
  categories: { label: string; value: string; percent: number }[];
}

const REPORT_DATA: Record<Period, ReportData> = {
  weekly: {
    usersLabel: '1,240 (↑ 8%)',
    savedLabel: 'Rs 2.1M',
    trending: [
      { label: 'iPhone 15', value: '2,340', percent: 100 },
      { label: 'Air fryer', value: '1,510', percent: 64 },
      { label: 'Samsung A54', value: '1,120', percent: 48 },
      { label: 'Sneakers', value: '740', percent: 32 },
    ],
    priceChanges: [
      { product: 'Anker 20000mAh PB', from: 'Rs 9,900', to: 'Rs 8,450', changePercent: -14.6 },
      { product: 'Redmi Note 13 8/256', from: 'Rs 58,999', to: 'Rs 54,999', changePercent: -6.8 },
      { product: 'PS5 Slim', from: 'Rs 142,900', to: 'Rs 149,900', changePercent: 4.9 },
    ],
    storeAverages: [
      { label: 'Telemart', value: 'Rs 41,200', percent: 88 },
      { label: 'Daraz', value: 'Rs 43,900', percent: 94 },
      { label: 'Mega.pk', value: 'Rs 46,700', percent: 100 },
      { label: 'Amazon', value: 'Rs 51,300', percent: 100 },
    ],
    categories: [
      { label: 'Mobiles', value: '42%', percent: 100 },
      { label: 'Electronics', value: '27%', percent: 64 },
      { label: 'Appliances', value: '18%', percent: 43 },
      { label: 'Fashion', value: '13%', percent: 31 },
    ],
  },
  monthly: {
    usersLabel: '4,920 (↑ 14%)',
    savedLabel: 'Rs 8.7M',
    trending: [
      { label: 'iPhone 15', value: '9,110', percent: 100 },
      { label: 'Samsung A54', value: '6,430', percent: 71 },
      { label: 'Air fryer', value: '5,280', percent: 58 },
      { label: 'PS5 slim', value: '3,960', percent: 43 },
    ],
    priceChanges: [
      { product: 'Samsung Galaxy A54 8/128', from: 'Rs 69,900', to: 'Rs 64,999', changePercent: -7.0 },
      { product: 'Philips Air Fryer HD9200', from: 'Rs 17,900', to: 'Rs 16,250', changePercent: -9.2 },
      { product: 'iPhone 15 Pro 256GB', from: 'Rs 372,000', to: 'Rs 379,500', changePercent: 2.0 },
    ],
    storeAverages: [
      { label: 'Telemart', value: 'Rs 39,800', percent: 85 },
      { label: 'Daraz', value: 'Rs 42,100', percent: 90 },
      { label: 'Mega.pk', value: 'Rs 44,900', percent: 96 },
      { label: 'Amazon', value: 'Rs 46,700', percent: 100 },
    ],
    categories: [
      { label: 'Mobiles', value: '46%', percent: 100 },
      { label: 'Electronics', value: '24%', percent: 52 },
      { label: 'Appliances', value: '17%', percent: 37 },
      { label: 'Fashion', value: '13%', percent: 28 },
    ],
  },
  yearly: {
    usersLabel: '48,300 (↑ 62%)',
    savedLabel: 'Rs 94.2M',
    trending: [
      { label: 'iPhone 15', value: '61,200', percent: 100 },
      { label: 'Samsung A54', value: '52,900', percent: 86 },
      { label: 'Redmi Note 13', value: '44,100', percent: 72 },
      { label: 'Air fryer', value: '38,700', percent: 63 },
    ],
    priceChanges: [
      { product: 'Redmi Note 13 8/256', from: 'Rs 64,999', to: 'Rs 54,999', changePercent: -15.4 },
      { product: 'Anker 20000mAh PB', from: 'Rs 10,900', to: 'Rs 8,450', changePercent: -22.5 },
      { product: 'PS5 Slim', from: 'Rs 129,900', to: 'Rs 149,900', changePercent: 15.4 },
    ],
    storeAverages: [
      { label: 'Telemart', value: 'Rs 38,600', percent: 82 },
      { label: 'Daraz', value: 'Rs 41,400', percent: 88 },
      { label: 'Mega.pk', value: 'Rs 43,900', percent: 94 },
      { label: 'Amazon', value: 'Rs 46,900', percent: 100 },
    ],
    categories: [
      { label: 'Mobiles', value: '49%', percent: 100 },
      { label: 'Electronics', value: '22%', percent: 45 },
      { label: 'Appliances', value: '16%', percent: 33 },
      { label: 'Fashion', value: '13%', percent: 27 },
    ],
  },
};

function buildCsv(period: Period, data: ReportData): string {
  const lines: string[] = [];
  lines.push(`Pricely admin report — ${period}`);
  lines.push('');
  lines.push('Summary');
  lines.push('Metric,Value');
  lines.push(`Active shoppers,${data.usersLabel}`);
  lines.push(`Saved by shoppers,${data.savedLabel}`);
  lines.push('');
  lines.push('Trending searches');
  lines.push('Search,Count');
  data.trending.forEach((r) => lines.push(`${r.label},${r.value}`));
  lines.push('');
  lines.push('Price changes');
  lines.push('Product,From,To,Change %');
  data.priceChanges.forEach((p) => lines.push(`${p.product},${p.from},${p.to},${p.changePercent}%`));
  lines.push('');
  lines.push('Average price by store');
  lines.push('Store,Average price');
  data.storeAverages.forEach((s) => lines.push(`${s.label},${s.value}`));
  lines.push('');
  lines.push('Category breakdown');
  lines.push('Category,Share of searches');
  data.categories.forEach((c) => lines.push(`${c.label},${c.value}`));
  return lines.join('\n');
}

interface ReportsScreenProps {
  navigation: { goBack: () => void };
}

export default function ReportsScreen({ navigation }: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | undefined>();
  const data = REPORT_DATA[period];

  const handleDownload = async () => {
    setDownloadError(undefined);
    setDownloading(true);
    try {
      const csv = buildCsv(period, data);
      const file = new File(Paths.cache, `pricely-report-${period}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Download report' });
      } else {
        setDownloadError('Sharing is not available on this device.');
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Unable to generate the report file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => void handleDownload()} disabled={downloading}>
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
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statGrid}>
        <StatTile value={data.usersLabel} label="Active shoppers" />
        <StatTile value={data.savedLabel} label="Saved by shoppers" />
      </View>

      <Text style={styles.sectionTitle}>Trending searches</Text>
      <View style={styles.barList}>
        {data.trending.map((r) => (
          <BarRow key={r.label} {...r} color={colors.accentMango} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Price changes</Text>
      <View style={styles.list}>
        {data.priceChanges.map((p) => {
          const dropped = p.changePercent < 0;
          return (
            <View key={p.product} style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.priceProduct}>{p.product}</Text>
                <Text style={styles.priceMeta}>{p.from} → {p.to}</Text>
              </View>
              <Text style={[styles.priceChange, dropped ? styles.priceDown : styles.priceUp]}>
                {dropped ? '▼' : '▲'} {Math.abs(p.changePercent)}%
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Average price by store</Text>
      <View style={styles.barList}>
        {data.storeAverages.map((r) => (
          <BarRow key={r.label} {...r} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Category breakdown</Text>
      <View style={styles.barList}>
        {data.categories.map((r) => (
          <BarRow key={r.label} {...r} color={colors.adminAccent} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
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
  downloadBtnText: { fontSize: 11.5, fontFamily: fonts.button, color: '#fff' },

  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19 },
  errorText: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, fontWeight: '600', marginTop: 8 },

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
