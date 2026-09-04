import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { api, ApiError, formatPrice, type AdminProduct } from './api/client';

interface AllProductsScreenProps {
  navigation: { goBack: () => void };
}

export default function AllProductsScreen({ navigation }: AllProductsScreenProps) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      setError(null);
      const res = await api.products(q.trim() || undefined);
      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Searching on the server rather than filtering a page of results, so a
  // match on product 300 is still found. Debounced so typing does not fire a
  // request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      load(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(search);
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
          <Text style={styles.stateTitle}>Couldn't load products</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              load(search);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>
            {search.trim() ? 'No products match that search' : 'No products yet'}
          </Text>
          <Text style={styles.stateBody}>
            {search.trim()
              ? 'Try a shorter search term.'
              : 'A product appears here once listings are merged in Duplicates.'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.list}>
        {products.map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={styles.rowMeta}>
                {p.category ?? 'Uncategorised'} · {p.storeCount}{' '}
                {p.storeCount === 1 ? 'store' : 'stores'}
                {p.listingCount !== p.storeCount ? ` · ${p.listingCount} listings` : ''}
              </Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.price}>
                {p.lowestPrice === null ? '—' : formatPrice(p.lowestPrice)}
              </Text>
              {p.highestPrice !== null && p.highestPrice !== p.lowestPrice ? (
                <Text style={styles.priceHigh}>to {formatPrice(p.highestPrice)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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

      <Text style={styles.title}>Products tracked</Text>
      <Text style={styles.subtext}>
        {total > 0
          ? `${total} ${total === 1 ? 'product' : 'products'} built from merged listings.`
          : 'Products are built by merging duplicate listings.'}
      </Text>

      <View style={styles.searchBox}>
        <Search size={17} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product name…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

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
    marginBottom: 18,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    paddingHorizontal: 13,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    padding: 0,
  },

  centered: { paddingTop: 50, alignItems: 'center' },
  stateTitle: {
    fontSize: 15,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 12.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    marginTop: 3,
  },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: 13, fontFamily: fonts.mono, fontWeight: '700', color: colors.textPrimary },
  priceHigh: {
    fontSize: 10.5,
    fontFamily: fonts.mono,
    color: colors.textTertiary,
    marginTop: 2,
  },
});