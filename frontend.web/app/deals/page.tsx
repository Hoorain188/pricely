'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingDown } from 'lucide-react';
import ProductCard from '../../components/ProductCard';
import LottieLoader from '../../components/LottieLoader';
import LottieBackButton from '../../components/LottieBackButton';
import { fetchBrowseProducts, ApiProduct } from '../../services/api';

const DEAL_CATEGORIES = [
  'mobiles_tablets',
  'laptops_computers',
  'tv_entertainment',
  'kitchen_appliances',
  'audio',
];

export default function DealsPage() {
  const [deals, setDeals] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function loadDeals() {
      setLoading(true);
      try {
        // Fetch products across multiple categories
        const resultsArray = await Promise.all(
          DEAL_CATEGORIES.map((cat) => fetchBrowseProducts(cat, undefined, 1, 1, 30))
        );

        if (active) {
          const allProducts = resultsArray.flatMap((r) => r.results || []);
          // Filter products with price drop or comparison
          const filteredDeals = allProducts.filter((p) => p.hasPriceDrop || p.hasComparison);
          const finalDeals = filteredDeals.length > 0 ? filteredDeals : allProducts.slice(0, 24);
          setDeals(finalDeals);
        }
      } catch (err) {
        console.warn('Deals load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDeals();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-red-600 via-rose-700 to-amber-700 text-white rounded-2xl p-6 sm:p-8 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LottieBackButton />
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-rose-200 block flex items-center gap-1">
              <Sparkles size={13} />
              Hot Price Drops
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Live Price Drop Deals
            </h1>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-full bg-white text-red-700">
          <TrendingDown size={14} />
          Up to 30% Savings
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <LottieLoader size={80} text="Scanning for latest price drop deals..." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {deals.map((product, idx) => (
            <ProductCard key={`${product.id || idx}`} product={product} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
