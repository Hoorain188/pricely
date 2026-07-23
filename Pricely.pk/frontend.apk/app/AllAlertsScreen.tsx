import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';

interface AlertItem {
  id: string;
  product: string;
  currentPrice: string;
  targetPrice: string;
  watchers: number;
  reached: boolean;
}

const ALERTS: AlertItem[] = [
  { id: 'al1', product: 'Redmi Note 13 8/256', currentPrice: 'Rs 54,999', targetPrice: 'Rs 53,000', watchers: 214, reached: false },
  { id: 'al2', product: 'Anker 20000mAh PB', currentPrice: 'Rs 8,450', targetPrice: 'Rs 8,450', watchers: 88, reached: true },
  { id: 'al3', product: 'Sony WH-CH520', currentPrice: 'Rs 9,999', targetPrice: 'Rs 8,500', watchers: 56, reached: false },
  { id: 'al4', product: 'Samsung Galaxy A54 8/128', currentPrice: 'Rs 64,999', targetPrice: 'Rs 60,000', watchers: 47, reached: false },
  { id: 'al5', product: 'Philips Air Fryer HD9200 5L', currentPrice: 'Rs 16,250', targetPrice: 'Rs 15,000', watchers: 39, reached: false },
  { id: 'al6', product: 'PS5 Slim', currentPrice: 'Rs 149,900', targetPrice: 'Rs 145,000', watchers: 31, reached: false },
];

interface AllAlertsScreenProps {
  navigation: { goBack: () => void };
}

export default function AllAlertsScreen({ navigation }: AllAlertsScreenProps) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Active alerts</Text>
      <Text style={styles.subtext}>Every product with a shopper-set price alert, across all users.</Text>

      <View style={styles.list}>
        {ALERTS.map((a) => (
          <View key={a.id} style={[styles.row, a.reached && styles.rowReached]}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{a.product}</Text>
              {a.reached && (
                <View style={styles.reachedPill}>
                  <Text style={styles.reachedPillText}>TARGET HIT</Text>
                </View>
              )}
            </View>
            <View style={styles.rowMetaRow}>
              <Text style={styles.rowMeta}>
                Current <Text style={styles.rowMetaStrong}>{a.currentPrice}</Text> · Target{' '}
                <Text style={styles.rowMetaStrong}>{a.targetPrice}</Text>
              </Text>
              <Text style={styles.watchers}>{a.watchers} watching</Text>
            </View>
          </View>
        ))}
      </View>
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
  title: { fontSize: 22, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 18 },

  list: { gap: 9 },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 14,
  },
  rowReached: { borderColor: colors.accentMango },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowTitle: { fontSize: 13, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  reachedPill: { backgroundColor: 'rgba(242,169,59,0.18)', borderRadius: 100, paddingVertical: 3, paddingHorizontal: 8 },
  reachedPillText: { fontSize: 9, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentMango },
  rowMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
  rowMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary },
  rowMetaStrong: { fontFamily: fonts.mono, fontWeight: '700', color: colors.textSecondary },
  watchers: { fontSize: 10.5, fontFamily: fonts.button, color: colors.accentSolid },
});
