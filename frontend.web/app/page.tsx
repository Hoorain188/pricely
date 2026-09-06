'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  Sparkles,
  ArrowRight,
  Zap,
  Grid,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronRight,
} from 'lucide-react';
import CategoryCarousel from '../components/CategoryCarousel';
import ProductCard from '../components/ProductCard';
import LottieLoader from '../components/LottieLoader';
import StatTile from '../components/StatTile';
import StatusPill from '../components/StatusPill';
import SegmentedControl from '../components/SegmentedControl';
import GradientButton from '../components/GradientButton';
import {
  fetchProductGroups,
  fetchBrowseProducts,
  fetchTrendingSearches,
  fetchRoundRobinDrops,
  ProductGroup,
  ApiProduct,
  formatPrice,
  calculateSavings,
} from '../services/api';
import StoreBadge, { CompareBadge } from '../components/StoreBadge';

const STORES = [
  {
    name: 'Telemart',
    slug: 'Telemart',
    color: '#1D9A7C',
    bgColor: 'bg-[#EAF4EF]',
    borderColor: 'border-[#1D9A7C]/30',
    description: 'Official tech & smartphone store in Pakistan',
  },
  {
    name: 'Mega.pk',
    slug: 'Mega.pk',
    color: '#2F6FB0',
    bgColor: 'bg-[#E7EEFC]',
    borderColor: 'border-[#2F6FB0]/30',
    description: 'Computers, laptops & home appliances deals',
  },
  {
    name: 'Daraz.pk',
    slug: 'Daraz',
    color: '#F57224',
    bgColor: 'bg-[#FFF0E6]',
    borderColor: 'border-[#F57224]/30',
    description: 'Largest e-commerce marketplace in Pakistan',
  },
];

// ─── Pull-to-refresh hook ────────────────────────────────────────────────────
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startY = useRef(0);
  const pullDeltaRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDelta, setPullDelta] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const THRESHOLD = 70;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 5) {
        startY.current = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!startY.current || isRefreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 5) {
        const clamped = Math.min(delta, THRESHOLD * 1.5);
        pullDeltaRef.current = clamped;
        setPullDelta(clamped);
        setIsPulling(true);
      }
    };
    const onTouchEnd = async () => {
      const currentDelta = pullDeltaRef.current;
      if (currentDelta >= THRESHOLD && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setPullDelta(0);
      pullDeltaRef.current = 0;
      startY.current = 0;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [THRESHOLD]);

  return { isPulling, pullDelta, isRefreshing, THRESHOLD };
}
// ────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [bestGroups, setBestGroups] = useState<ProductGroup[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ApiProduct[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('All');

  // Today's Drops - round robin interleaved across all categories
  const [dropProducts, setDropProducts] = useState<ApiProduct[]>([]);
  const [dropPage, setDropPage] = useState(1);
  const [dropHasMore, setDropHasMore] = useState(true);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropLoadingMore, setDropLoadingMore] = useState(false);
  const dropSentinelRef = useRef<HTMLDivElement>(null);

  // ── Load Home Data ─────────────────────────────────────────────────────────
  const loadHomeData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsData, browseData, trending] = await Promise.all([
        fetchProductGroups(),
        fetchBrowseProducts('mobiles_tablets', undefined, undefined, 1, 12),
        fetchTrendingSearches(10),
      ]);
      setBestGroups(groupsData.slice(0, 6));
      setFeaturedProducts(browseData.results || []);
      setTrendingSearches(trending);
    } catch (err) {
      console.warn('Home data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const [dropSeed, setDropSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // ── Today's Drops Loader (Round-Robin Interleaved) ─────────────────────────
  const loadDropProducts = useCallback(async (page: number, currentSeed?: number, reset = false) => {
    if (page === 1) {
      setDropLoading(true);
    } else {
      setDropLoadingMore(true);
    }
    try {
      const res = await fetchRoundRobinDrops(page, 20, currentSeed ?? dropSeed);
      const results = res.results || [];
      if (reset || page === 1) {
        setDropProducts(results);
      } else {
        setDropProducts((prev) => {
          const existing = new Set(prev.map((p) => String(p.id || p.handle || p.title)));
          const unique = results.filter((p) => !existing.has(String(p.id || p.handle || p.title)));
          return [...prev, ...unique];
        });
      }
      setDropPage(page);
      setDropHasMore(res.hasMore);
    } catch {
      // ignore
    } finally {
      setDropLoading(false);
      setDropLoadingMore(false);
    }
  }, [dropSeed]);

  // Initial load
  useEffect(() => {
    loadHomeData();
    loadDropProducts(1, dropSeed, true);
  }, [loadHomeData, loadDropProducts]);

  // ── Pull to Refresh Callback ───────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setDropSeed(newSeed);
    await Promise.all([
      loadHomeData(),
      loadDropProducts(1, newSeed, true),
    ]);
  }, [loadHomeData, loadDropProducts]);

  const { isPulling, pullDelta, isRefreshing, THRESHOLD } = usePullToRefresh(handleRefresh);

  // Infinite scroll observer for drops
  useEffect(() => {
    const sentinel = dropSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && dropHasMore && !dropLoadingMore && !dropLoading) {
          loadDropProducts(dropPage + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dropHasMore, dropLoadingMore, dropLoading, dropPage, loadDropProducts]);

  // ── Filtered Featured Products ─────────────────────────────────────────────
  const filteredFeaturedProducts =
    selectedStoreFilter === 'All'
      ? featuredProducts
      : featuredProducts.filter(
          (p) => p.store.toLowerCase() === selectedStoreFilter.toLowerCase()
        );

  return (
    <div className="space-y-10 pb-8 relative">
      {/* ── Pull to Refresh Indicator ────────────────────────────────────────── */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-md transition-all duration-300"
        style={{
          opacity: isPulling || isRefreshing ? 1 : 0,
          transform: `translateX(-50%) translateY(${isPulling || isRefreshing ? 0 : -60}px)`,
          pointerEvents: 'none',
        }}
      >
        <RefreshCw
          size={15}
          className={`text-[#1D9A7C] ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: isPulling ? `rotate(${(pullDelta / THRESHOLD) * 360}deg)` : undefined }}
        />
        <span className="text-xs font-bold text-slate-700">
          {isRefreshing
            ? 'Refreshing...'
            : pullDelta >= THRESHOLD
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>

      {/* ── Category Carousel (with real products) ─────────────────────────── */}
      <CategoryCarousel />

      {/* ── Trending Searches ───────────────────────────────────────────────── */}
      {trendingSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-rose-500" size={22} />
              Trending Searches
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Based on live user activity
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => router.push(`/search?q=${encodeURIComponent(item.label)}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#1D9A7C] hover:text-[#1D9A7C] hover:bg-[#EAF4EF] transition-all shadow-xs cursor-pointer"
              >
                <Search size={12} className="text-slate-400" />
                {item.label}
                {item.count > 0 && (
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                    {item.count > 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Live Market Insights ────────────────────────────────────────────── */}
      <div className="bg-slate-50/70 border border-slate-200/70 rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              Live Price Intelligence Market Overview
            </h3>
            <StatusPill status="live" label="Live Sync" />
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">Refreshed real-time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            value="1,240+"
            label="Live Price Tracked Products"
            trend="+18% new listings this week"
            onClick={() => router.push('/category/mobiles_tablets')}
          />
          <StatTile
            value="3 Major"
            label="Verified Pakistani Stores"
            trend="Telemart, Mega.pk & Daraz"
          />
          <StatTile
            value="35% OFF"
            label="Max Multi-Store Price Difference"
            trend="Highest price savings opportunity"
            onClick={() => router.push('/deals')}
          />
        </div>
      </div>

      {/* ── Shop by Store ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="text-[#1D9A7C]" size={22} />
              Shop by Store
            </h2>
            <p className="text-xs text-slate-500">
              Filter products directly from Pakistan&apos;s leading online retailers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STORES.map((st) => (
            <Link
              key={st.name}
              href={`/category/mobiles_tablets?store=${st.slug}`}
              className={`p-5 rounded-2xl border ${st.borderColor} ${st.bgColor} hover:shadow-md transition-all group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-extrabold text-lg sm:text-xl" style={{ color: st.color }}>
                  {st.name}
                </span>
                <span
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-2xs group-hover:translate-x-1 transition-transform"
                  style={{ color: st.color }}
                >
                  <ArrowRight size={16} />
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{st.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Best Multi-Store Comparisons ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={22} />
              Best Multi-Store Comparisons
            </h2>
            <p className="text-xs text-slate-500">
              Products available at 2+ stores with live lowest price highlights
            </p>
          </div>
          <Link
            href="/category/mobiles_tablets"
            className="text-xs font-bold text-[#1D9A7C] hover:underline flex items-center gap-1"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <LottieLoader size={60} text="Loading best price comparisons..." />
        ) : bestGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bestGroups.map((group) => {
              const offers = group.offers || [];
              const highestPrice =
                offers.length > 1 ? Math.max(...offers.map((o) => o.price)) : 0;
              const savings =
                highestPrice > 0 ? calculateSavings(group.lowestPrice, highestPrice) : 0;

              return (
                <div
                  key={group.groupId}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <CompareBadge text={`${group.storeCount} Stores`} />
                      {savings > 0 && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                          Save up to {savings}%
                        </span>
                      )}
                    </div>

                    <div className="relative w-full h-40 rounded-xl bg-slate-50 overflow-hidden mb-3">
                      <img
                        src={group.image || `https://picsum.photos/seed/${group.groupId}/300/300`}
                        alt={group.title}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-2">
                      {group.title}
                    </h3>
                  </div>

                  <div>
                    <div className="my-3 pt-3 border-t border-slate-100 space-y-2">
                      {offers.slice(0, 3).map((off, oIdx) => (
                        <div
                          key={oIdx}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50"
                        >
                          <StoreBadge store={off.store} />
                          <span
                            className={`font-mono font-bold ${
                              off.price === group.lowestPrice
                                ? 'text-emerald-700 font-extrabold'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatPrice(off.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Lowest Price
                        </span>
                        <span className="text-base font-extrabold text-[#1D9A7C] font-mono">
                          {formatPrice(group.lowestPrice)}
                        </span>
                      </div>

                      <Link
                        href={`/product/${group.groupId}?title=${encodeURIComponent(group.title)}`}
                        className="px-4 py-2 rounded-xl bg-[#1D9A7C] hover:bg-[#0E6B4F] text-white font-bold text-xs shadow-2xs transition-colors"
                      >
                        Compare All
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-6 text-center text-slate-500 text-sm">
            No comparisons loaded yet. Check back soon!
          </div>
        )}
      </div>

      {/* ── Today's Best Drops (Round-Robin Interleaved Across All Categories) ─ */}
      <div>
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-amber-500" size={22} />
            Today&apos;s Best Drops
          </h2>
        </div>

        {/* Drop Products Grid with Infinite Scroll */}
        {dropLoading ? (
          <LottieLoader size={60} text="Loading best drops across all categories..." />
        ) : dropProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {dropProducts.map((product, idx) => (
                <ProductCard key={`${product.id || idx}`} product={product} index={idx} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={dropSentinelRef} className="flex items-center justify-center py-6">
              {dropLoadingMore && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <RefreshCw size={16} className="animate-spin text-[#1D9A7C]" />
                  Loading more deals...
                </div>
              )}
              {!dropHasMore && dropProducts.length > 0 && (
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-3">You&apos;ve seen all current best drops</p>
                  <Link
                    href="/category/mobiles_tablets"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1D9A7C] hover:underline"
                  >
                    Explore all categories <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-6 text-center text-slate-500 text-sm">
            No products found. Pull down to refresh!
          </div>
        )}
      </div>

      {/* ── Featured Products with Store Filter ─────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Grid size={22} className="text-indigo-500" />
              Featured Products
            </h2>
            <p className="text-xs text-slate-500">
              Live products from Telemart, Mega.pk and Daraz
            </p>
          </div>

          <SegmentedControl
            options={[
              { key: 'All', label: 'All Stores', icon: <Grid size={13} /> },
              { key: 'Telemart', label: 'Telemart' },
              { key: 'Mega.pk', label: 'Mega.pk' },
              { key: 'Daraz', label: 'Daraz' },
            ]}
            activeKey={selectedStoreFilter}
            onChange={setSelectedStoreFilter}
            className="w-full sm:w-auto"
          />
        </div>

        {loading ? (
          <LottieLoader size={60} text="Loading products..." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFeaturedProducts.map((product, idx) => (
                <ProductCard key={`${product.id || idx}`} product={product} index={idx} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <GradientButton
                label="Explore All Deals & Products"
                onClick={() => router.push('/category/mobiles_tablets')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
