'use client';

import React from 'react';
import { ExternalLink, CheckCircle2, Award } from 'lucide-react';
import { CompareOffer, formatPrice } from '../services/api';
import StoreBadge from './StoreBadge';

interface CompareSectionProps {
  offers: CompareOffer[];
  lowestPrice?: number;
}

export default function CompareSection({ offers, lowestPrice }: CompareSectionProps) {
  if (!offers || offers.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-sm text-slate-500">
        No multi-store comparison data available for this item yet.
      </div>
    );
  }

  // Sort offers by price ascending
  const sortedOffers = [...offers].sort((a, b) => a.price - b.price);
  const minPrice = lowestPrice || sortedOffers[0]?.price || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Award className="text-[#1D9A7C]" size={22} />
          <h3 className="text-base font-bold text-slate-900">
            Compare Prices Across Stores
          </h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
          {sortedOffers.length} Store Offers
        </span>
      </div>

      <div className="space-y-3">
        {sortedOffers.map((offer, idx) => {
          const isLowest = idx === 0 || offer.price <= minPrice;
          const priceDiff = !isLowest ? offer.price - minPrice : 0;

          return (
            <div
              key={`${offer.store}-${idx}`}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${
                isLowest
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <StoreBadge store={offer.store} className="px-2.5 py-1 text-xs" />
                {isLowest && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <CheckCircle2 size={13} />
                    Lowest Price
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div className={`text-base sm:text-lg font-bold font-mono ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {formatPrice(offer.price)}
                  </div>
                  {priceDiff > 0 && (
                    <div className="text-[11px] text-slate-500">
                      +Rs {priceDiff.toLocaleString()} higher
                    </div>
                  )}
                </div>

                {offer.url ? (
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                      isLowest
                        ? 'bg-[#1D9A7C] text-white hover:bg-[#0E6B4F]'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    View Offer
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">No direct URL</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
