import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';
import SegmentedControl from '../components/SegmentedControl';
import { colors, fonts, radii } from '../theme/colors';
import { useActivityStore } from '../context/ActivityContext';
import { useAuthStore } from '../context/AuthContext';
import { api, formatPrice, ApiError, type ApiDuplicateGroup } from './api/client';

/** Server group plus the checkbox state, which only lives on the client. */
interface UiGroup extends ApiDuplicateGroup {
  checked: Record<number, boolean>;
}

function toUiGroup(g: ApiDuplicateGroup): UiGroup {
  return {
    ...g,
    checked: Object.fromEntries(g.listings.map((l) => [l.id, l.preSelected])),
  };
}

export default function AdminDuplicatesScreen() {
  const [tab, setTab] = useState<'review' | 'merged'>('review');
  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [merged, setMerged] = useState<ApiDuplicateGroup[]>([]);
  const [counts, setCounts] = useState({ pending: 0, merged: 0 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { logActivity } = useActivityStore();
  const { user } = useAuthStore();

  // Support can merge and split too — the backend allows Admin and Support.
  const canManage = user?.role === 'admin' || user?.role === 'support';

  const load = useCallback(async (query: string) => {
    try {
      setLoadError(null);
      const [pending, mergedRes] = await Promise.all([
        api.duplicates('pending', query || undefined),
        api.duplicates('merged', query || undefined),
      ]);

      setGroups(pending.items.map(toUiGroup));
      setMerged(mergedRes.items);
      setCounts({ pending: pending.pendingCount, merged: pending.mergedCount });

      // Open the strongest match by default, as the mock does.
      setExpandedId((current) =>
        current !== null && pending.items.some((g) => g.id === current)
          ? current
          : pending.items[0]?.id ?? null,
      );
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load duplicates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(''); }, [load]);

  // Debounce so a search does not fire a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => { void load(search.trim()); }, 350);
    return () => clearTimeout(handle);
  }, [search, load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load(search.trim());
  };

  const toggleListing = (groupId: number, listingId: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, checked: { ...g.checked, [listingId]: !g.checked[listingId] } },
      ),
    );
  };

  const handleMerge = async (group: UiGroup) => {
    const selected = group.listings.filter((l) => group.checked[l.id]).map((l) => l.id);
    if (selected.length < 2) return;

    setBusyId(group.id);
    setActionError(null);

    try {
      const res = await api.mergeGroup(group.id, selected);

      // The server returns fresh tab counts, so no refetch is needed.
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
      logActivity(`Merged "${group.title}" duplicate group`);

      // Bring the newly merged row into the other tab.
      void load(search.trim());
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Merge failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleNotAMatch = async (group: UiGroup) => {
    setBusyId(group.id);
    setActionError(null);

    try {
      const res = await api.rejectGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
      logActivity(`Marked "${group.title}" as not a match`);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not reject the group.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSplit = async (group: ApiDuplicateGroup) => {
    // Must be the product id, not a listing id — they are different tables.
    if (group.productId == null) {
      setActionError('This group has no merged product to split.');
      return;
    }

    setBusyId(group.id);
    setActionError(null);

    try {
      const res = await api.splitProduct(group.productId);
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
      logActivity(`Split "${group.title}" back into separate listings`);
      // The group returns to Needs review, so both tabs need refreshing.
      void load(search.trim());
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Split failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load duplicates</Text>
        <Text style={styles.errorBody}>{loadError}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => { setLoading(true); void load(search.trim()); }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Duplicates</Text>

      <SegmentedControl
        options={[
          { key: 'review', label: `Needs review · ${counts.pending}` },
          { key: 'merged', label: `Merged · ${counts.merged}` },
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

      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      {tab === 'review' ? (
        <View style={styles.list}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>
              {search ? `No pending groups match "${search}".` : 'Nothing left to review.'}
            </Text>
          ) : (
            groups.map((group) => {
              const expanded = expandedId === group.id;
              const selectedCount = group.listings.filter((l) => group.checked[l.id]).length;
              const busy = busyId === group.id;

              return (
                <View key={group.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(expanded ? null : group.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productTitle}>{group.title}</Text>
                      {!expanded && (
                        <Text style={styles.collapsedMeta}>
                          {group.listings.length} listings to review
                        </Text>
                      )}
                    </View>
                    <View style={expanded ? styles.matchPillStrong : styles.matchPill}>
                      <Text style={expanded ? styles.matchPillStrongText : styles.matchPillText}>
                        {expanded ? `${group.matchScore}% MATCH` : `${group.matchScore}%`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <>
                      <View style={styles.listingList}>
                        {group.listings.map((listing) => {
                          const isChecked = group.checked[listing.id];
                          return (
                            <TouchableOpacity
                              key={listing.id}
                              style={styles.listingRow}
                              onPress={() => toggleListing(group.id, listing.id)}
                              activeOpacity={0.7}
                              disabled={busy}
                            >
                              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                {isChecked ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.listingTitle, !isChecked && styles.listingTitleMuted]}>
                                  {listing.title}
                                </Text>
                                <Text style={styles.listingMeta}>
                                  {listing.storeName} · {formatPrice(listing.price, listing.currency)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {canManage ? (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.mergeBtn,
                              (selectedCount < 2 || busy) && styles.btnDisabled,
                            ]}
                            disabled={selectedCount < 2 || busy}
                            onPress={() => void handleMerge(group)}
                          >
                            <Text style={styles.mergeBtnText}>
                              {busy ? 'Working…' : 'Merge selected'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.rejectBtn, busy && styles.btnDisabled]}
                            disabled={busy}
                            onPress={() => void handleNotAMatch(group)}
                          >
                            <Text style={styles.rejectBtnText}>Not a match</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.viewOnlyNote}>
                          Only admins and support can merge or reject a match.
                        </Text>
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
          {merged.length === 0 ? (
            <Text style={styles.emptyText}>
              {search ? `No merged products match "${search}".` : 'Nothing has been merged yet.'}
            </Text>
          ) : (
            merged.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.mergedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle}>{p.title}</Text>
                    <Text style={styles.collapsedMeta}>
                      {p.listings.map((l) => l.storeName).join(' + ')}
                    </Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity
                      style={[styles.splitBtn, busyId === p.id && styles.btnDisabled]}
                      disabled={busyId === p.id}
                      onPress={() => void handleSplit(p)}
                    >
                      <Text style={styles.splitBtnText}>
                        {busyId === p.id ? '…' : 'Split'}
                      </Text>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.background },
  errorTitle: { fontSize: 15, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  errorBody: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 12.5, fontFamily: fonts.button, color: '#fff' },
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
  actionError: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, marginTop: 10 },
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
  btnDisabled: { opacity: 0.5 },
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