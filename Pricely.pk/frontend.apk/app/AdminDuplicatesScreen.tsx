import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Check, Search } from 'lucide-react-native';
import SegmentedControl from '../components/SegmentedControl';
import { colors, fonts, radii } from '../theme/colors';
import { useActivityStore } from '../context/ActivityContext';
import { useAuthStore } from '../context/AuthContext';

interface Listing {
  id: string;
  title: string;
  store: string;
  price: string;
  checked: boolean;
}

interface ReviewGroup {
  id: string;
  product: string;
  matchPercent: number;
  listings: Listing[];
}

interface MergedProduct {
  id: string;
  product: string;
  meta: string;
}

const INITIAL_REVIEW_GROUPS: ReviewGroup[] = [
  {
    id: 'g1',
    product: 'iPhone 15 Pro 256GB',
    matchPercent: 92,
    listings: [
      { id: 'l1', title: 'iPhone 15 Pro 256GB Black', store: 'Daraz', price: 'Rs 385,000', checked: true },
      { id: 'l2', title: 'Apple iPhone15Pro 256 BLK', store: 'Telemart', price: 'Rs 389,900', checked: true },
      { id: 'l3', title: 'iPhone 15 Pro (256) Blk', store: 'Mega.pk', price: 'Rs 379,500', checked: false },
    ],
  },
  {
    id: 'g2',
    product: 'Samsung Galaxy A54 8/128',
    matchPercent: 76,
    listings: [
      { id: 'l4', title: 'Samsung Galaxy A54 8/128 Awesome Graphite', store: 'Daraz', price: 'Rs 64,999', checked: true },
      { id: 'l5', title: 'Samsung A54 5G 8GB 128GB', store: 'Mega.pk', price: 'Rs 66,500', checked: true },
    ],
  },
  {
    id: 'g3',
    product: 'Philips Air Fryer HD9200',
    matchPercent: 88,
    listings: [
      { id: 'l6', title: 'Philips Air Fryer HD9200 5L', store: 'Telemart', price: 'Rs 16,250', checked: true },
      { id: 'l7', title: 'Philips HD9200/90 Airfryer', store: 'Amazon', price: 'Rs 17,900', checked: false },
    ],
  },
  {
    id: 'g4',
    product: 'Anker PowerCore 20000mAh',
    matchPercent: 81,
    listings: [
      { id: 'l8', title: 'Anker PowerCore 20K Slim', store: 'Daraz', price: 'Rs 8,450', checked: true },
      { id: 'l9', title: 'Anker 20000mAh Power Bank', store: 'Telemart', price: 'Rs 8,900', checked: true },
    ],
  },
  {
    id: 'g5',
    product: 'Nike Air Zoom Pegasus 40',
    matchPercent: 69,
    listings: [
      { id: 'l10', title: 'Nike Air Zoom Pegasus 40', store: 'Daraz', price: 'Rs 21,900', checked: true },
      { id: 'l11', title: 'Nike Pegasus 40 Running Shoes', store: 'Mega.pk', price: 'Rs 22,400', checked: false },
    ],
  },
];

const INITIAL_MERGED: MergedProduct[] = [
  { id: 'm1', product: 'iPhone 14 128GB', meta: 'Daraz + Mega.pk · merged 14 days ago' },
  { id: 'm2', product: 'Redmi Note 12 6/128', meta: 'Telemart + Amazon · merged 3 days ago' },
  { id: 'm3', product: 'Anker 20000mAh PB', meta: 'Daraz + Telemart + Mega.pk · merged 21 days ago' },
];

export default function AdminDuplicatesScreen() {
  const [tab, setTab] = useState<'review' | 'merged'>('review');
  const [groups, setGroups] = useState(INITIAL_REVIEW_GROUPS);
  const [merged, setMerged] = useState(INITIAL_MERGED);
  const [expandedId, setExpandedId] = useState<string | null>('g1');
  const [search, setSearch] = useState('');
  const { logActivity } = useActivityStore();
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.product.toLowerCase().includes(q));
  }, [groups, search]);

  const filteredMerged = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((m) => m.product.toLowerCase().includes(q));
  }, [merged, search]);

  const toggleListing = (groupId: string, listingId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, listings: g.listings.map((l) => (l.id === listingId ? { ...l, checked: !l.checked } : l)) }
      )
    );
  };

  const persistMerge = async (group: ReviewGroup) => {
    await Promise.resolve();
    return true;
  };

  const persistNotAMatch = async (group: ReviewGroup) => {
    await Promise.resolve();
    return true;
  };

  const persistSplit = async (product: MergedProduct) => {
    await Promise.resolve();
    return true;
  };

  const handleMerge = async (group: ReviewGroup) => {
    const checkedCount = group.listings.filter((listing) => listing.checked).length;
    if (checkedCount < 2) return;

    try {
      const persisted = await persistMerge(group);
      if (!persisted) return;

      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setMerged((prev) => [
        { id: group.id, product: group.product, meta: `${checkedCount} listings merged just now` },
        ...prev,
      ]);
      logActivity(`Merged "${group.product}" duplicate group`);
    } catch (error) {
      console.error('Failed to merge duplicate group', error);
    }
  };

  const handleNotAMatch = async (group: ReviewGroup) => {
    try {
      const persisted = await persistNotAMatch(group);
      if (!persisted) return;

      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      logActivity(`Marked "${group.product}" as not a match`);
    } catch (error) {
      console.error('Failed to mark duplicate group as not a match', error);
    }
  };

  const handleSplit = async (product: MergedProduct) => {
    try {
      const persisted = await persistSplit(product);
      if (!persisted) return;

      setMerged((prev) => prev.filter((m) => m.id !== product.id));
      logActivity(`Split "${product.product}" back into separate listings`);
    } catch (error) {
      console.error('Failed to split merged product', error);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Duplicates</Text>

      <SegmentedControl
        options={[
          { key: 'review', label: `Needs review · ${groups.length}` },
          { key: 'merged', label: `Merged · ${merged.length}` },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'review' | 'merged')}
      />

      <View style={styles.searchBar}>
        <Search size={15} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product name…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {tab === 'review' ? (
        <View style={styles.list}>
          {filteredGroups.length === 0 ? (
            <Text style={styles.emptyText}>No pending groups match "{search}".</Text>
          ) : (
            filteredGroups.map((group) => {
              const expanded = expandedId === group.id;
              return (
                <View key={group.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(expanded ? null : group.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productTitle}>{group.product}</Text>
                      {!expanded && <Text style={styles.collapsedMeta}>{group.listings.length} listings to review</Text>}
                    </View>
                    <View style={expanded ? styles.matchPillStrong : styles.matchPill}>
                      <Text style={expanded ? styles.matchPillStrongText : styles.matchPillText}>
                        {expanded ? `${group.matchPercent}% MATCH` : `${group.matchPercent}%`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <>
                      <View style={styles.listingList}>
                        {group.listings.map((listing) => (
                          <TouchableOpacity
                            key={listing.id}
                            style={styles.listingRow}
                            onPress={() => toggleListing(group.id, listing.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.checkbox, listing.checked && styles.checkboxChecked]}>
                              {listing.checked ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.listingTitle, !listing.checked && styles.listingTitleMuted]}>
                                {listing.title}
                              </Text>
                              <Text style={styles.listingMeta}>{listing.store} · {listing.price}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {canManage ? (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={styles.mergeBtn}
                            disabled={group.listings.filter((listing) => listing.checked).length < 2}
                            onPress={() => void handleMerge(group)}
                          >
                            <Text style={styles.mergeBtnText}>Merge selected</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleNotAMatch(group)}>
                            <Text style={styles.rejectBtnText}>Not a match</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.viewOnlyNote}>Only admins can merge or reject a match.</Text>
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {filteredMerged.length === 0 ? (
            <Text style={styles.emptyText}>No merged products match "{search}".</Text>
          ) : (
            filteredMerged.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.mergedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle}>{p.product}</Text>
                    <Text style={styles.collapsedMeta}>{p.meta}</Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity style={styles.splitBtn} onPress={() => handleSplit(p)}>
                      <Text style={styles.splitBtnText}>Split</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <Text style={styles.footnote}>
            Splitting undoes the merge — each listing goes back to being its own product.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },

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
    marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontFamily: fonts.body, color: colors.textPrimary, paddingVertical: 10 },
  emptyText: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 },

  list: { gap: 12, marginTop: 16 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 15,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productTitle: { fontSize: 14, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },

  matchPillStrong: { backgroundColor: 'rgba(242,169,59,0.18)', borderRadius: 100, paddingVertical: 3, paddingHorizontal: 8 },
  matchPillStrongText: { fontSize: 10, fontFamily: fonts.mono, fontWeight: '700', color: colors.accentMango },
  matchPill: { backgroundColor: colors.border, borderRadius: 100, paddingVertical: 3, paddingHorizontal: 8 },
  matchPillText: { fontSize: 10, fontFamily: fonts.mono, fontWeight: '700', color: colors.textSecondary },

  listingList: { gap: 9, marginTop: 13, marginBottom: 13 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accentSolid, borderColor: colors.accentSolid },
  listingTitle: { fontSize: 12, fontFamily: fonts.label, color: colors.textPrimary },
  listingTitleMuted: { color: colors.textTertiary },
  listingMeta: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 1 },

  actionsRow: { flexDirection: 'row', gap: 9 },
  viewOnlyNote: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 },
  mergeBtn: { flex: 1, backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  mergeBtnText: { fontSize: 12, fontFamily: fonts.button, color: '#fff' },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.3,
    borderColor: 'rgba(220,38,38,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 12, fontFamily: fonts.button, color: colors.danger },

  collapsedMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 3 },

  mergedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  splitBtn: { borderWidth: 1.3, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 13 },
  splitBtnText: { fontSize: 11.5, fontFamily: fonts.button, color: colors.textSecondary },

  footnote: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
