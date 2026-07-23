import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import SegmentedControl from '../components/SegmentedControl';
import RolePill from '../components/RolePill';
import { colors, fonts, radii } from '../theme/colors';
import { useTeamStore } from '../context/TeamContext';

interface Customer {
  id: string;
  name: string;
  email: string;
  alerts: number;
}

const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Ahmed Raza', email: 'ahmed@email.com', alerts: 3 },
  { id: 'c2', name: 'Sara Khan', email: 'sara@email.com', alerts: 7 },
  { id: 'c3', name: 'Fatima Noor', email: 'fatima@email.com', alerts: 1 },
];

export default function AdminUsersScreen() {
  const [tab, setTab] = useState<'customers' | 'team'>('customers');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(DEFAULT_CUSTOMERS);
  const [customerTotal, setCustomerTotal] = useState(DEFAULT_CUSTOMERS.length);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | undefined>();
  const { team } = useTeamStore();
  const customerApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

  useEffect(() => {
    const searchQuery = search.trim();
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const loadCustomers = async () => {
      if (!customerApiUrl) {
        setCustomerError(undefined);
        return;
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);
      setLoadingCustomers(true);
      setCustomerError(undefined);
      try {
        const params = new URLSearchParams({ page: '1', per_page: '500' });
        if (searchQuery) params.set('search', searchQuery);
        const response = await fetch(`${customerApiUrl.replace(/\/$/, '')}/customers?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const nextCustomers = Array.isArray(payload?.customers)
          ? payload.customers
          : Array.isArray(payload?.data)
            ? payload.data
            : DEFAULT_CUSTOMERS;
        const nextTotal = typeof payload?.total === 'number' ? payload.total : nextCustomers.length;

        if (!cancelled) {
          setCustomers(nextCustomers);
          setCustomerTotal(nextTotal);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Customer loading timed out');
            setCustomerError('Customer loading timed out. Please try again.');
          } else {
            setCustomerError('Unable to load customers right now.');
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setLoadingCustomers(false);
        }
      }
    };

    void loadCustomers();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [customerApiUrl, search]);

  const handleExportCsv = async () => {
    if (!customerApiUrl) {
      setExportError('Export is unavailable because no customer API is configured.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    setExporting(true);
    setExportError(undefined);
    try {
      const response = await fetch(`${customerApiUrl.replace(/\/$/, '')}/customers/export`, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Export timed out. Please try again.'
        : error instanceof Error ? error.message : 'Unable to export customers.';
      setExportError(message);
    } finally {
      clearTimeout(timeoutId);
      setExporting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Users</Text>
        {tab === 'customers' && (
          <TouchableOpacity
            style={[styles.ghostBtn, (!customerApiUrl || exporting) && styles.ghostBtnDisabled]}
            onPress={() => void handleExportCsv()}
            disabled={!customerApiUrl || exporting}
          >
            <Text style={styles.ghostBtnText}>{exporting ? 'Exporting…' : customerApiUrl ? 'Export CSV' : 'Unavailable'}</Text>
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
          {loadingCustomers && filteredCustomers.length === 0 ? (
            <Text style={styles.emptyText}>Loading customers…</Text>
          ) : customerError ? (
            <Text style={styles.emptyText}>{customerError}</Text>
          ) : filteredCustomers.length === 0 ? (
            <Text style={styles.emptyText}>No customers match "{search}".</Text>
          ) : (
            filteredCustomers.map((c) => (
              <View key={c.id} style={styles.row}>
                <View>
                  <Text style={styles.rowName}>{c.name}</Text>
                  <Text style={styles.rowMeta}>{c.email} · {c.alerts} alert{c.alerts === 1 ? '' : 's'}</Text>
                </View>
                <RolePill role="customer" />
              </View>
            ))
          )}
          {exportError ? <Text style={styles.emptyText}>{exportError}</Text> : null}
        </View>
      ) : (
        <View style={styles.list}>
          {team.map((m) => (
            <View key={m.id} style={styles.row}>
              <View>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowMeta}>{m.email} · {m.title}</Text>
              </View>
              <RolePill role={m.role} />
            </View>
          ))}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontFamily: fonts.headline, fontWeight: '700', color: colors.textPrimary },
  ghostBtn: { borderWidth: 1.3, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  ghostBtnDisabled: { opacity: 0.6 },
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

  legend: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textTertiary, lineHeight: 16, marginTop: 4 },
  legendAdmin: { color: colors.adminAccent, fontFamily: fonts.button },
  legendSupport: { color: '#8A5A12', fontFamily: fonts.button },
  legendReadonly: { color: colors.textSecondary, fontFamily: fonts.button },
});
