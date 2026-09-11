'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, AlertCircle } from 'lucide-react';
import ProductCard from '../../components/ProductCard';
import LottieLoader from '../../components/LottieLoader';
import LottieBackButton from '../../components/LottieBackButton';
import { fetchSearchProducts, ApiProduct } from '../../services/api';

const STORES = ['All', 'Telemart', 'Mega.pk', 'Daraz'];

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const initialStore = searchParams.get('store') || 'All';

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>(initialStore);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function executeSearch() {
      if (!query.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await fetchSearchProducts(
          query,
          selectedStore === 'All' ? undefined : selectedStore
        );
        if (active) {
          setProducts(results || []);
        }
      } catch (err) {
        console.warn('Search execute error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    executeSearch();

    return () => {
      active = false;
    };
  }, [query, selectedStore]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LottieBackButton />
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block">
              Search Results
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              &quot;{query}&quot;
            </h1>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#EAF4EF] text-[#1D9A7C]">
          {products.length} Products Found
        </span>
      </div>

      {/* Store Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 pr-2 border-r border-slate-200">
          <Filter size={14} />
          Filter Store:
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

      {/* Search Grid */}
      {loading ? (
        <LottieLoader size={80} text={`Searching for "${query}"...`} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product, idx) => (
            <ProductCard key={`${product.id || idx}`} product={product} index={idx} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto my-8 space-y-3">
          <AlertCircle size={48} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No search results</h3>
          <p className="text-xs text-slate-500">
            Try searching for &quot;iPhone&quot;, &quot;Laptop&quot;, &quot;Redmi&quot;, or &quot;Air Fryer&quot;.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LottieLoader size={80} text="Loading search..." />}>
      <SearchContent />
    </Suspense>
  );
}
