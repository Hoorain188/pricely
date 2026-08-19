import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Search } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts, radii } from '../theme/colors';
import type { AdminStackParamList } from './AdminNavigator';

interface RawListing {
  id: string;
  title: string;
  price: string;
  lastSeen: string;
}

const LISTINGS_BY_STORE: Record<string, RawListing[]> = {
  Daraz: [
    { id: 'd1', title: 'iPhone 15 Pro 256GB Black', price: 'Rs 385,000', lastSeen: '2 min ago' },
    { id: 'd2', title: 'Redmi Note 13 8/256', price: 'Rs 54,999', lastSeen: '2 min ago' },
    { id: 'd3', title: 'Anker PowerCore 20K Slim', price: 'Rs 8,450', lastSeen: '2 min ago' },
    { id: 'd4', title: 'Samsung Galaxy A54 8/128 Awesome Graphite', price: 'Rs 64,999', lastSeen: '2 min ago' },
  ],
  Telemart: [
    { id: 't1', title: 'Apple iPhone15Pro 256 BLK', price: 'Rs 389,900', lastSeen: '5 min ago' },
    { id: 't2', title: 'Anker 20000mAh Power Bank', price: 'Rs 8,900', lastSeen: '5 min ago' },
    { id: 't3', title: 'Philips Air Fryer HD9200 5L', price: 'Rs 16,250', lastSeen: '5 min ago' },
  ],
  'Mega.pk': [
    { id: 'm1', title: 'iPhone 15 Pro (256) Blk', price: 'Rs 379,500', lastSeen: '3 min ago' },
    { id: 'm2', title: 'Samsung A54 5G 8GB 128GB', price: 'Rs 66,500', lastSeen: '3 min ago' },
    { id: 'm3', title: 'Nike Pegasus 40 Running Shoes', price: 'Rs 22,400', lastSeen: '3 min ago' },
  ],
  Amazon: [
    { id: 'a1', title: 'Philips HD9200/90 Airfryer', price: 'Rs 17,900', lastSeen: '1 min ago' },
    { id: 'a2', title: 'Nike Air Zoom Pegasus 40', price: 'Rs 21,900', lastSeen: '1 min ago' },
  ],
};

type StoreListingsScreenProps = NativeStackScreenProps<AdminStackParamList, 'StoreListings'>;

export default function StoreListingsScreen({ navigation, route }: StoreListingsScreenProps) {
  const { store } = route.params;
  const [search, setSearch] = useState('');
  const allListings = LISTINGS_BY_STORE[store] ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allListings;
    return allListings.filter((l) => l.title.toLowerCase().includes(q));
  }, [allListings, search]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>{store}</Text>
      <Text style={styles.subtext}>{allListings.length} raw listings pulled by this store's scraper.</Text>

      <View style={styles.searchBar}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search listings…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No listings match "{search}".</Text>
        ) : (
          filtered.map((l) => (
            <View key={l.id} style={styles.row}>
              <Text style={styles.rowTitle}>{l.title}</Text>
              <View style={styles.rowMetaRow}>
                <Text style={styles.rowPrice}>{l.price}</Text>
                <Text style={styles.rowLastSeen}>{l.lastSeen}</Text>
              </View>
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 13,
  },
  rowTitle: { fontSize: 12.5, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  rowMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rowPrice: { fontSize: 12, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentSolid },
  rowLastSeen: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary },
});
