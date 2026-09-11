'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { adminApi, ApiCustomer, ApiTeamMember, ApiError } from '../../../services/api';
import SegmentedControl from '../../../components/SegmentedControl';
import RolePill from '../../../components/RolePill';
import LottieLoader from '../../../components/LottieLoader';

export default function AdminUsersPage() {
  const [tab, setTab] = useState<'customers' | 'team'>('customers');
  const [search, setSearch] = useState('');

  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [team, setTeam] = useState<ApiTeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    try {
      setError(null);
      const [customersRes, teamRes] = await Promise.all([
        adminApi.customers(query || undefined, 1),
        adminApi.team(),
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



  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = await adminApi.customers(search.trim() || undefined, page + 1);
      setCustomers((prev) => [...prev, ...next.items]);
      setPage(next.page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExport = () => {
    setExportError(null);
    const url = adminApi.customersExportUrl();
    try {
      window.open(url, '_blank');
    } catch {
      setExportError('Could not open the export URL.');
    }
  };

  if (loading) return <LottieLoader size={60} text="Loading users..." />;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage customers and team members</p>
        </div>
        {tab === 'customers' && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
        )}
      </div>

      <SegmentedControl
        options={[
          { key: 'customers', label: `Customers · ${customerTotal.toLocaleString()}` },
          { key: 'team', label: `Team · ${team.length}` },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'customers' | 'team')}
        className="max-w-sm"
      />

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>}
      {exportError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{exportError}</div>}

      {tab === 'customers' ? (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="customer-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent bg-white"
            />
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {search ? `No customers match "${search}".` : 'No customers yet.'}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {customers.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-5 py-3.5 ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.email} · {c.alertCount} alert{c.alertCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <RolePill role="customer" />
                  </div>
                ))}
              </div>

              {page < totalPages && (
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : `Load more (${customers.length} of ${customerTotal.toLocaleString()})`}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {team.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No team members yet.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {team.map((m, i) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-5 py-3.5 ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-extrabold">{m.avatarInitial}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m.email}{m.jobTitle ? ` · ${m.jobTitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <RolePill role={m.role} />
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed px-1">
            <span className="font-bold text-violet-600">Admin</span> — full access incl. merge/split & re-run.{' '}
            <span className="font-bold text-amber-600">Support</span> — view + respond to users.{' '}
            <span className="font-bold text-slate-500">Read-only</span> — dashboard & reports only.
          </p>
        </div>
      )}
    </div>
  );
}
