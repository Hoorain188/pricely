import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Search } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';

interface TrackedProduct {
  id: string;
  title: string;
  category: string;
  lowestPrice: string;
  storeCount: number;
}

const TRACKED_PRODUCTS: TrackedProduct[] = [
  { id: 'p1', title: 'iPhone 15 Pro 256GB', category: 'Mobiles', lowestPrice: 'Rs 379,500', storeCount: 3 },
  { id: 'p2', title: 'Redmi Note 13 8/256', category: 'Mobiles', lowestPrice: 'Rs 54,999', storeCount: 4 },
  { id: 'p3', title: 'Samsung Galaxy A54 8/128', category: 'Mobiles', lowestPrice: 'Rs 64,999', storeCount: 2 },
  { id: 'p4', title: 'Philips Air Fryer HD9200 5L', category: 'Appliances', lowestPrice: 'Rs 16,250', storeCount: 2 },
  { id: 'p5', title: 'Anker PowerCore 20000mAh', category: 'Electronics', lowestPrice: 'Rs 8,450', storeCount: 2 },
  { id: 'p6', title: 'Nike Air Zoom Pegasus 40', category: 'Fashion', lowestPrice: 'Rs 21,900', storeCount: 2 },
  { id: 'p7', title: 'Sony WH-CH520', category: 'Electronics', lowestPrice: 'Rs 9,999', storeCount: 3 },
  { id: 'p8', title: 'PS5 Slim', category: 'Electronics', lowestPrice: 'Rs 149,900', storeCount: 3 },
];

interface AllProductsScreenProps {
  navigation: { goBack: () => void };
}

export default function AllProductsScreen({ navigation }: AllProductsScreenProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TRACKED_PRODUCTS;
    return TRACKED_PRODUCTS.filter(
      (p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Products tracked</Text>
      <Text style={styles.subtext}>{TRACKED_PRODUCTS.length.toLocaleString()} normalized products, deduped across all 4 stores.</Text>

      <View style={styles.searchBar}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or category…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No products match "{search}".</Text>
        ) : (
          filtered.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.title}</Text>
                <Text style={styles.rowMeta}>{p.category} · matched across {p.storeCount} stores</Text>
              </View>
              <Text style={styles.rowPrice}>{p.lowestPrice}</Text>
            </View>
          ))
        )}
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
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 16 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontFamily: fonts.body, color: colors.textPrimary, paddingVertical: 10 },
  emptyText: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 },

  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  rowTitle: { fontSize: 12.5, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  rowMeta: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 3 },
  rowPrice: { fontSize: 13, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentSolid },
});
