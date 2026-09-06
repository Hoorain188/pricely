import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, BellOff } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { api, ApiError, formatPrice, type AdminAlert } from './api/client';

interface AllAlertsScreenProps {
  navigation: { goBack: () => void };
}

export default function AllAlertsScreen({ navigation }: AllAlertsScreenProps) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.adminAlerts();
      setAlerts(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentSolid} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Couldn't load alerts</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              load();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alerts.length === 0) {
      return (
        <View style={styles.centered}>
          <View style={styles.iconWrap}>
            <BellOff size={22} color={colors.textTertiary} />
          </View>
          <Text style={styles.stateTitle}>No price alerts yet</Text>
          <Text style={styles.stateBody}>
            Shoppers set a target price from a product page. The first one will show
            up here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.list}>
        {alerts.map((a) => (
          <View key={a.id} style={[styles.row, a.isTriggered && styles.rowHit]}>
            {a.imageUrl ? (
              <Image source={{ uri: a.imageUrl }} style={styles.thumb} resizeMode="contain" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]} />
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {a.title}
              </Text>
              <Text style={styles.rowMeta}>
                {a.storeName ? `${a.storeName} · ` : ''}
                Now {a.currentPrice === null ? '—' : formatPrice(a.currentPrice)} · Target{' '}
                {formatPrice(a.targetPrice)}
              </Text>
            </View>

            {a.isTriggered ? (
              <View style={styles.hitPill}>
                <Text style={styles.hitPillText}>TARGET HIT</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentSolid}
        />
      }
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.75}
      >
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Active alerts</Text>
      <Text style={styles.subtext}>
        Every product with a shopper-set price alert, across all users.
      </Text>

      {renderBody()}
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
    marginBottom: 20,
  },

  centered: { paddingTop: 50, alignItems: 'center', paddingHorizontal: 12 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 15,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 12.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.accentSolid,
    borderRadius: radii.medium,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  retryText: { fontSize: 13, fontFamily: fonts.button, fontWeight: '700', color: '#fff' },

  list: { gap: 9 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  rowHit: { borderColor: colors.accentMango },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.background },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  rowTitle: {
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  rowMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 3 },
  hitPill: {
    backgroundColor: '#FDF1DC',
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  hitPillText: { fontSize: 8.5, fontFamily: fonts.mono, fontWeight: '700', color: '#9A6B12' },
});