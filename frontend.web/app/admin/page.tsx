'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  adminApi, DashboardResponse, ApiError, timeAgo, toBarRows,
} from '../../services/api';
import { useAuth } from '../context/AuthContext';
import StatTile from '../../components/StatTile';
import StatusPill from '../../components/StatusPill';
import BarRow from '../../components/BarRow';
import LottieLoader from '../../components/LottieLoader';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const canRerun = user?.role === 'admin' || user?.role === 'support';

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true); // true by default, no effect-setState needed
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rerunState, setRerunState] = useState<Record<number, { loading: boolean; error?: string }>>({});
  const inFlightReruns = useRef<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setData(await adminApi.dashboard());
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch — effect only triggers the async work; no synchronous setState in effect body.
  useEffect(() => {
    const run = async () => { await load(); };
    void run();
  }, [load]);

  const handleRerun = async (storeId: number) => {
    if (inFlightReruns.current[storeId]) return;
    inFlightReruns.current[storeId] = true;
    setRerunState((prev) => ({ ...prev, [storeId]: { loading: true, error: undefined } }));
    try {
      await adminApi.rerunScraper(storeId);
      setRerunState((prev) => ({ ...prev, [storeId]: { loading: false } }));
      await load();
    } catch (error) {
      setRerunState((prev) => ({
        ...prev,
        [storeId]: { loading: false, error: error instanceof ApiError ? error.message : 'Unable to re-run.' },
      }));
    } finally {
      inFlightReruns.current[storeId] = false;
    }
  };

  if (loading) return <LottieLoader size={60} text="Loading dashboard..." />;

  if (loadError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-slate-700 font-bold text-lg">Couldn&apos;t load the dashboard</p>
        <p className="text-slate-400 text-sm">{loadError}</p>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="px-5 py-2 bg-[#1D9A7C] text-white rounded-xl font-bold text-sm hover:bg-[#0E6B4F] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const trend = (kpi: { changePercent: number | null }) =>
    kpi.changePercent === null ? '—' : `${kpi.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(kpi.changePercent)}% this week`;
  const failingCount = kpis.scrapersTotal - kpis.scrapersHealthy;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Good morning</p>
          <h1 className="text-2xl font-extrabold text-slate-900">{user?.name ?? 'Admin'}</h1>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono tracking-wide">
            LAST UPDATED {timeAgo(data.lastUpdatedAt).toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => { setRefreshing(true); void load(); }}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          value={kpis.totalUsers.value.toLocaleString()}
          label="Total users"
          trend={trend(kpis.totalUsers)}
        />
        <StatTile
          value={kpis.productsTracked.value.toLocaleString()}
          label="Products tracked"
          trend={trend(kpis.productsTracked)}
        />
        <StatTile
          value={`${kpis.scrapersHealthy} / ${kpis.scrapersTotal}`}
          label="Scrapers healthy"
          trend={failingCount > 0 ? `${failingCount} failing` : 'all healthy'}
          warn={failingCount > 0}
        />
        <StatTile
          value={kpis.activeAlerts.value.toLocaleString()}
          label="Active alerts"
          trend={trend(kpis.activeAlerts)}
        />
      </div>

      {/* Scraper Health */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-3">Scraper health</h2>
        <div className="space-y-2">
          {data.scrapers.map((s) => {
            const rerunStatus = rerunState[s.storeId];
            const isRunning = Boolean(rerunStatus?.loading) || s.status === 'running';
            const isDisabled = isRunning || !s.canRun;
            return (
              <div
                key={s.storeId}
                className={`flex items-center justify-between bg-white rounded-2xl border p-4 shadow-sm ${
                  s.status === 'fail' ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{s.storeName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {timeAgo(s.lastRunAt)} · {s.itemCount.toLocaleString()} items
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={s.status === 'running' ? 'ok' : s.status} label={s.status === 'running' ? 'Running' : s.status.toUpperCase()} />
                  {canRerun && (
                    <div className="text-right">
                      <button
                        disabled={isDisabled}
                        onClick={() => void handleRerun(s.storeId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          s.status === 'fail'
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-[#1D9A7C] text-white hover:bg-[#0E6B4F]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isRunning ? 'Running…' : 'Re-run'}
                      </button>
                      {rerunStatus?.error && <p className="text-[10px] text-rose-600 mt-1 max-w-[120px] text-right">{rerunStatus.error}</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4">Top searches this week</h2>
          {data.topSearches.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No searches yet this week.</p>
          ) : (
            toBarRows(data.topSearches).map((r) => <BarRow key={r.label} {...r} />)
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4">Most-tracked products</h2>
          {data.mostTracked.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No products tracked yet.</p>
          ) : (
            toBarRows(data.mostTracked).map((r) => <BarRow key={r.label} {...r} color="#F2A93B" />)
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4">Store click-throughs</h2>
          {data.storeClicks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No click-throughs recorded yet.</p>
          ) : (
            toBarRows(data.storeClicks).map((r) => <BarRow key={r.label} {...r} color="#7C3AED" />)
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4">Recent errors</h2>
        {data.recentErrors.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No errors. Everything is running clean. ✓</p>
        ) : (
          <div className="space-y-2">
            {data.recentErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{e.storeName}</span> — {e.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
