'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Check } from 'lucide-react';
import {
  adminApi, ApiDuplicateGroup, ApiListing, ApiError,
} from '../../../services/api';
import { useAuth } from '../../context/AuthContext';
import SegmentedControl from '../../../components/SegmentedControl';
import LottieLoader from '../../../components/LottieLoader';

interface UiGroup extends ApiDuplicateGroup {
  checked: Record<number, boolean>;
}

function toUiGroup(g: ApiDuplicateGroup): UiGroup {
  return { ...g, checked: Object.fromEntries(g.listings.map((l: ApiListing) => [l.id, l.preSelected])) };
}

export default function AdminDuplicatesPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'support';

  const [tab, setTab] = useState<'review' | 'merged'>('review');
  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [merged, setMerged] = useState<ApiDuplicateGroup[]>([]);
  const [counts, setCounts] = useState({ pending: 0, merged: 0 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    try {
      setLoadError(null);
      const [pending, mergedRes] = await Promise.all([
        adminApi.duplicates('pending', query || undefined),
        adminApi.duplicates('merged', query || undefined),
      ]);
      setGroups(pending.items.map(toUiGroup));
      setMerged(mergedRes.items);
      setCounts({ pending: pending.pendingCount, merged: pending.mergedCount });
      setExpandedId((current) =>
        current !== null && pending.items.some((g) => g.id === current)
          ? current
          : pending.items[0]?.id ?? null,
      );
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load duplicates.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const run = async () => { await load(''); };
    void run();
  }, [load]);

  // Debounced search re-fetch
  useEffect(() => {
    const handle = setTimeout(async () => { await load(search.trim()); }, 350);
    return () => clearTimeout(handle);
  }, [search, load]);


  const toggleListing = (groupId: number, listingId: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId ? g : { ...g, checked: { ...g.checked, [listingId]: !g.checked[listingId] } },
      ),
    );
  };

  const handleMerge = async (group: UiGroup) => {
    const selected = group.listings.filter((l) => group.checked[l.id]).map((l) => l.id);
    if (selected.length < 2) return;
    setBusyId(group.id);
    setActionError(null);
    try {
      const res = await adminApi.mergeGroup(group.id, selected);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
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
      const res = await adminApi.rejectGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not reject the group.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSplit = async (group: ApiDuplicateGroup) => {
    if (group.productId == null) { setActionError('No merged product to split.'); return; }
    setBusyId(group.id);
    setActionError(null);
    try {
      const res = await adminApi.splitProduct(group.productId);
      setCounts({ pending: res.pendingCount, merged: res.mergedCount });
      void load(search.trim());
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Split failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LottieLoader size={60} text="Loading duplicates..." />;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-slate-700 font-bold">Couldn&apos;t load duplicates</p>
        <p className="text-slate-400 text-sm">{loadError}</p>
        <button onClick={() => { setLoading(true); void load(search.trim()); }}
          className="px-5 py-2 bg-[#1D9A7C] text-white rounded-xl font-bold text-sm hover:bg-[#0E6B4F] transition-colors">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Duplicates</h1>
        <p className="text-sm text-slate-400 mt-0.5">Review and merge duplicate product listings</p>
      </div>

      <SegmentedControl
        options={[
          { key: 'review', label: `Needs review · ${counts.pending}` },
          { key: 'merged', label: `Merged · ${counts.merged}` },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'review' | 'merged')}
        className="max-w-sm"
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="duplicates-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent bg-white"
        />
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{actionError}</div>
      )}

      {tab === 'review' ? (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {search ? `No pending groups match "${search}".` : 'Nothing left to review. ✓'}
            </div>
          ) : (
            groups.map((group) => {
              const expanded = expandedId === group.id;
              const selectedCount = group.listings.filter((l) => group.checked[l.id]).length;
              const busy = busyId === group.id;

              return (
                <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : group.id)}
                    className="w-full flex items-start justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{group.title}</p>
                      {!expanded && (
                        <p className="text-xs text-slate-400 mt-1">{group.listings.length} listings to review</p>
                      )}
                    </div>
                    <span className={`ml-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      expanded
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {group.matchScore}%{expanded ? ' MATCH' : ''}
                    </span>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="space-y-2 mt-4">
                        {group.listings.map((listing) => {
                          const isChecked = group.checked[listing.id];
                          return (
                            <button
                              key={listing.id}
                              type="button"
                              onClick={() => toggleListing(group.id, listing.id)}
                              disabled={busy}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
                            >
                              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isChecked ? 'bg-[#1D9A7C] border-[#1D9A7C]' : 'border-slate-300'
                              }`}>
                                {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${isChecked ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {listing.title}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {listing.storeName} · Rs {listing.price.toLocaleString()}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {canManage ? (
                        <div className="flex gap-2 mt-4">
                          <button
                            disabled={selectedCount < 2 || busy}
                            onClick={() => void handleMerge(group)}
                            className="flex-1 py-2.5 rounded-xl bg-[#1D9A7C] text-white text-sm font-bold hover:bg-[#0E6B4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busy ? 'Working…' : 'Merge selected'}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void handleNotAMatch(group)}
                            className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                          >
                            Not a match
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-4">Only admins and support can merge or reject.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {merged.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {search ? `No merged products match "${search}".` : 'Nothing has been merged yet.'}
            </div>
          ) : (
            merged.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{p.listings.map((l) => l.storeName).join(' + ')}</p>
                </div>
                {canManage && (
                  <button
                    disabled={busyId === p.id}
                    onClick={() => void handleSplit(p)}
                    className="ml-4 shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {busyId === p.id ? '…' : 'Split'}
                  </button>
                )}
              </div>
            ))
          )}
          <p className="text-xs text-slate-400 text-center">
            Splitting undoes the merge — each listing goes back to being its own product.
          </p>
        </div>
      )}
    </div>
  );
}
