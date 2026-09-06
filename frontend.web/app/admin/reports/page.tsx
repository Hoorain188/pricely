'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  adminApi, Period, ReportsResponse, ApiError,
  toBarRows, toMoneyBarRows, toShareBarRows,
} from '../../../services/api';
import SegmentedControl from '../../../components/SegmentedControl';
import StatTile from '../../../components/StatTile';
import BarRow from '../../../components/BarRow';
import LottieLoader from '../../../components/LottieLoader';

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.reports(p));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on period change
  useEffect(() => {
    const run = async () => { await load(period); };
    void run();
  }, [period, load]);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">Platform analytics and insights</p>
        </div>
        <SegmentedControl
          options={[
            { key: 'weekly',  label: 'Weekly'  },
            { key: 'monthly', label: 'Monthly' },
            { key: 'yearly',  label: 'Yearly'  },
          ]}
          activeKey={period}
          onChange={(k) => setPeriod(k as Period)}
        />
      </div>

      {loading ? (
        <LottieLoader size={60} text="Loading reports..." />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-slate-700 font-bold">Couldn&apos;t load reports</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={() => void load(period)}
            className="px-5 py-2 bg-[#1D9A7C] text-white rounded-xl font-bold text-sm hover:bg-[#0E6B4F] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatTile
              value={data.activeShoppers.value.toLocaleString()}
              label="Active shoppers"
              trend={
                data.activeShoppers.changePercent !== null
                  ? `${data.activeShoppers.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.activeShoppers.changePercent)}% vs last period`
                  : '—'
              }
            />
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-extrabold font-mono text-slate-900">
                  Rs {data.savedByShoppers.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">Total saved by shoppers</p>
              <div className="mt-3 flex items-center gap-1">
                <TrendingUp size={14} className="text-[#1D9A7C] shrink-0" />
                <span className="text-[11px] font-bold text-[#1D9A7C]">Using Pricely price comparison</span>
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trending Searches */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-900 mb-4">Trending searches</h2>
              {data.trendingSearches.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No searches this period.</p>
              ) : (
                toBarRows(data.trendingSearches).map((r) => <BarRow key={r.label} {...r} />)
              )}
            </div>

            {/* Store Averages */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-900 mb-4">Average price by store</h2>
              {data.storeAverages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No data this period.</p>
              ) : (
                toMoneyBarRows(data.storeAverages).map((r) => <BarRow key={r.label} {...r} color="#2F6FB0" />)
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-900 mb-4">Category breakdown</h2>
              {data.categories.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No data this period.</p>
              ) : (
                toShareBarRows(data.categories).map((r) => <BarRow key={r.label} {...r} color="#F57224" />)
              )}
            </div>

            {/* Price Changes */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-900 mb-4">Price changes</h2>
              {data.priceChanges.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No price changes this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.priceChanges.map((pc, i) => {
                    const up = pc.changePercent > 0;
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                        <div className={`p-1.5 rounded-lg shrink-0 ${up ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                          {up
                            ? <TrendingUp size={14} className="text-rose-600" />
                            : <TrendingDown size={14} className="text-emerald-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{pc.product}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Rs {pc.fromPrice.toLocaleString()} → Rs {pc.toPrice.toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${up ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {up ? '+' : ''}{pc.changePercent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
