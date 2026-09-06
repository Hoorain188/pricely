'use client';

import React, { useState, useEffect, use } from 'react';
import { RefreshCw, Filter, AlertCircle } from 'lucide-react';
import ProductCard from '../../../components/ProductCard';
import LottieLoader from '../../../components/LottieLoader';
import LottieBackButton from '../../../components/LottieBackButton';
import { fetchBrowseProducts, ApiProduct } from '../../../services/api';

const CATEGORY_NAMES: Record<string, string> = {
  mobiles_tablets: 'Mobiles & Tablets',
  laptops_computers: 'Laptops & Computers',
  tv_entertainment: 'TVs & Entertainment',
  home_appliances: 'Home Appliances',
  kitchen_appliances: 'Kitchen Appliances',
  cameras: 'Cameras',
  audio: 'Audio',
  wearables: 'Wearables',
  gaming: 'Gaming',
  accessories: 'Accessories',
};

const STORES = ['All', 'Telemart', 'Mega.pk', 'Daraz'];

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const categorySlug = resolvedParams.slug || 'mobiles_tablets';
  const categoryTitle = CATEGORY_NAMES[categorySlug] || categorySlug.replace('_', ' ');

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Fetch Category Products
  useEffect(() => {
    let active = true;

    async function loadCategoryData() {
      setLoading(true);
      setPage(1);
      try {
        const res = await fetchBrowseProducts(
          categorySlug,
          selectedStore === 'All' ? undefined : selectedStore,
          seed,
          1,
          60
        );

        if (active) {
          setProducts(res.results || []);
          setHasMore(res.hasMore);
        }
      } catch (err) {
        console.warn('Category fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCategoryData();

    return () => {
      active = false;
    };
  }, [categorySlug, selectedStore, seed]);

  // Load More Products
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loading) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetchBrowseProducts(
        categorySlug,
        selectedStore === 'All' ? undefined : selectedStore,
        seed,
        nextPage,
        60
      );

      if (res.results && res.results.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id || p.handle || p.title)));
          const uniqueNew = res.results.filter(
            (p) => !existingIds.has(String(p.id || p.handle || p.title))
          );
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(res.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefreshSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#1D9A7C] to-[#0E6B4F] text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LottieBackButton />
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-200 block">
              Category
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold capitalize tracking-tight">
              {categoryTitle}
            </h1>
          </div>
        </div>

        {/* Refresh seed button */}
        <button
          onClick={handleRefreshSeed}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Shuffle Products
        </button>
      </div>

      {/* Store Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 pr-2 border-r border-slate-200">
          <Filter size={14} />
          Stores:
        </span>
        {STORES.map((st) => {
          const active = selectedStore === st;
          return (
            <button
              key={st}
              onClick={() => setSelectedStore(st)}
              type="button"
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#1D9A7C] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {loading ? (
        <LottieLoader size={80} text={`Fetching ${categoryTitle} products...`} />
      ) : products.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.map((product, idx) => (
              <ProductCard key={`${product.id || idx}`} product={product} index={idx} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                type="button"
                className="px-6 py-3 rounded-full bg-[#1D9A7C] hover:bg-[#0E6B4F] text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? 'Loading More Products...' : 'Load More Products ↓'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try switching store filters or shuffle product seed.
          </p>
        </div>
      )}
    </div>
  );
}
