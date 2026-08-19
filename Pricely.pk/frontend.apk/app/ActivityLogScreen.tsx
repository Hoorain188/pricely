import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/colors';
import { api, timeAgo, ApiError, type ApiActivityEntry } from './api/client';

interface ActivityLogScreenProps {
  navigation: { goBack: () => void };
}

export default function ActivityLogScreen({ navigation }: ActivityLogScreenProps) {
  const [entries, setEntries] = useState<ApiActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.activity(1);
      setEntries(res.items);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the activity log.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;

    setLoadingMore(true);
    try {
      const next = await api.activity(page + 1);
      setEntries((prev) => [...prev, ...next.items]);
      setPage(next.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more entries.');
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accentSolid} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
      }
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
        <ArrowLeft size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Activity log</Text>
      <Text style={styles.subtext}>Who did what, across the whole admin team.</Text>

      {error ? <Text style={styles.errorLine}>{error}</Text> : null}

      <View style={styles.list}>
        {entries.length === 0 && !error ? (
          <Text style={styles.emptyText}>Nothing has happened yet.</Text>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.row}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                {/* The sentence is written by the server, so a new action type
                    never needs a new app build to display correctly. */}
                <Text style={styles.action}>{e.description}</Text>
                <Text style={styles.meta}>{e.actorName} · {timeAgo(e.occurredAt)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {page < totalPages && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={() => void loadMore()}
          disabled={loadingMore}
        >
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load older entries'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
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
  subtext: { fontSize: 13.5, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 20 },
  errorLine: { fontSize: 11.5, fontFamily: fonts.body, color: colors.danger, marginBottom: 12 },
  emptyText: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 },
  list: { gap: 14 },
  row: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accentSolid, marginTop: 6 },
  action: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary, lineHeight: 18 },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  loadMoreBtn: {
    borderWidth: 1.3,
    borderColor: colors.border,
    borderRadius: radii.medium,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  loadMoreText: { fontSize: 12, fontFamily: fonts.button, color: colors.textSecondary },
});