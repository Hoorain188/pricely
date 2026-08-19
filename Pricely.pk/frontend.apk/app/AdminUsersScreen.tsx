import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { Search } from 'lucide-react-native';
import SegmentedControl from '../components/SegmentedControl';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import {
  api, customersExportUrl, ApiError,
  type ApiCustomer, type ApiTeamMember,
} from './api/client';

export default function AdminUsersScreen() {
  const [tab, setTab] = useState<'customers' | 'team'>('customers');
  const [search, setSearch] = useState('');

  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [team, setTeam] = useState<ApiTeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    try {
      setError(null);
      const [customersRes, teamRes] = await Promise.all([
        api.customers(query || undefined, 1),
        api.team(),
      ]);

      setCustomers(customersRes.items);
      setCustomerTotal(customersRes.totalCount);
      setPage(customersRes.page);
      setTotalPages(customersRes.totalPages);
      setTeam(teamRes.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(''); }, [load]);

  // Search runs on the server, so debounce to avoid a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => { void load(search.trim()); }, 350);
    return () => clearTimeout(handle);
  }, [search, load]);

  /** 200+ customers is too many for one screen, so pull a page at a time. */
  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;

    setLoadingMore(true);
    try {
      const next = await api.customers(search.trim() || undefined, page + 1);
      setCustomers((prev) => [...prev, ...next.items]);
      setPage(next.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more customers.');
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * The CSV is a file download, which React Native cannot save directly.
   * Handing the URL to the browser lets the phone deal with it.
   */
  const handleExportCsv = async () => {
    setExportError(null);
    const url = customersExportUrl();

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('No app can open that link.');
      await Linking.openURL(url);
    } catch {
      setExportError('Could not open the export. Check the API URL.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  if (error && customers.length === 0 && team.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn't load users</Text>
        <Text style={styles.errorBody}>{error}</Text>
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(search.trim()); }}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Users</Text>
        {tab === 'customers' && (
          <TouchableOpacity style={styles.ghostBtn} onPress={() => void handleExportCsv()}>
            <Text style={styles.ghostBtnText}>Export CSV</Text>
          </TouchableOpacity>
        )}
      </View>

      <SegmentedControl
        options={[
          { key: 'customers', label: `Customers · ${customerTotal.toLocaleString()}` },
          { key: 'team', label: `Team · ${team.length}` },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'customers' | 'team')}
      />

      {tab === 'customers' ? (
        <View style={styles.list}>
          <View style={styles.searchBar}>
            <Search size={15} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers…"
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {customers.length === 0 ? (
            <Text style={styles.emptyText}>
              {search ? `No customers match "${search}".` : 'No customers yet.'}
            </Text>
          ) : (
            <>
              {customers.map((c) => (
                <View key={c.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{c.name}</Text>
                    <Text style={styles.rowMeta}>
                      {c.email} · {c.alertCount} alert{c.alertCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <RolePill role="customer" />
                </View>
              ))}

              {page < totalPages && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => void loadMore()}
                  disabled={loadingMore}
                >
                  <Text style={styles.loadMoreText}>
                    {loadingMore
                      ? 'Loading…'
                      : `Load more (${customers.length} of ${customerTotal.toLocaleString()})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {exportError ? <Text style={styles.errorLine}>{exportError}</Text> : null}
        </View>
      ) : (
        <View style={styles.list}>
          {team.length === 0 ? (
            <Text style={styles.emptyText}>No team members yet.</Text>
          ) : (
            team.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{m.name}</Text>
                  <Text style={styles.rowMeta}>
                    {m.email}{m.jobTitle ? ` · ${m.jobTitle}` : ' · —'}
                  </Text>
                </View>
                <RolePill role={m.role} />
              </View>
            ))
          )}

          <Text style={styles.legend}>
            <Text style={styles.legendAdmin}>Admin</Text> — full access incl. merge/split & re-run.{' '}
            <Text style={styles.legendSupport}>Support</Text> — view + respond to users.{' '}
            <Text style={styles.legendReadonly}>Read-only</Text> — dashboard & reports only.
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
  errorLine: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, marginTop: 8 },
  retryBtn: { backgroundColor: colors.accentSolid, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  retryText: { fontSize: 12.5, fontFamily: fonts.button, color: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary },
  ghostBtn: { borderWidth: 1.3, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  ghostBtnText: { fontSize: 11.5, fontFamily: fonts.button, color: colors.textSecondary },
  list: { gap: 9, marginTop: 16 },
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
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontFamily: fonts.body, color: colors.textPrimary, paddingVertical: 10 },
  emptyText: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    padding: 14,
  },
  rowName: { fontSize: 13, fontFamily: fonts.label, fontWeight: '700', color: colors.textPrimary },
  rowMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 1 },
  loadMoreBtn: {
    borderWidth: 1.3,
    borderColor: colors.border,
    borderRadius: radii.medium,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  loadMoreText: { fontSize: 12, fontFamily: fonts.button, color: colors.textSecondary },
  legend: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary, lineHeight: 16, marginTop: 4 },
  legendAdmin: { color: colors.adminAccent, fontFamily: fonts.button },
  legendSupport: { color: '#8A5A12', fontFamily: fonts.button },
  legendReadonly: { color: colors.textSecondary, fontFamily: fonts.button },
});