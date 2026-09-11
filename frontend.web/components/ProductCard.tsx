'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ApiProduct, formatPrice } from '../services/api';
import StoreBadge, { CompareBadge, PriceDropBadge } from './StoreBadge';

interface ProductCardProps {
  product: ApiProduct;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  // Construct href safely
  const productKey = product.id
    ? String(product.id)
    : product.handle
    ? encodeURIComponent(product.handle)
    : encodeURIComponent(product.url || product.title);

  const queryParams = new URLSearchParams();
  if (product.store) queryParams.set('store', product.store);
  if (product.url) queryParams.set('url', product.url);
  if (product.handle) queryParams.set('handle', product.handle);
  if (product.title) queryParams.set('title', product.title);
  if (product.price) queryParams.set('price', product.price);
  if (product.imageUrl) queryParams.set('image', product.imageUrl);

  const targetHref = `/product/${productKey}?${queryParams.toString()}`;

  // Image fallback URL if empty
  const fallbackImg = `https://picsum.photos/seed/${encodeURIComponent(product.title || 'product')}/300/300`;
  const imgSrc = product.imageUrl || fallbackImg;

  return (
    <Link
      href={targetHref}
      className="group flex flex-col bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:shadow-md hover:border-[#1D9A7C]/40 transition-all duration-200 h-full"
    >
      <div className="relative w-full h-36 sm:h-40 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center mb-3">
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          unoptimized={imgSrc.includes('loremflickr') || imgSrc.includes('picsum')}
        />
      </div>

      <div className="flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-700 line-clamp-2 leading-snug group-hover:text-[#1D9A7C] transition-colors">
            {product.title}
          </h3>
          <p className="text-sm sm:text-base font-bold text-slate-900 mt-1 font-mono">
            {formatPrice(product.price)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
          {product.hasComparison && <CompareBadge text="2+ stores" />}
          {product.hasPriceDrop && <PriceDropBadge />}
          {product.store && <StoreBadge store={product.store} />}
        </div>
      </div>
    </Link>
  );
}
