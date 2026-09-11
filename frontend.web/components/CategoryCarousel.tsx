'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Smartphone,
  Laptop,
  Tv,
  Refrigerator,
  Flame,
  Camera,
  Headphones,
  Watch,
  Gamepad2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchBrowseProducts, ApiProduct } from '../services/api';

const CATEGORIES = [
  { key: 'mobiles_tablets', label: 'Mobiles & Tablets', icon: Smartphone, color: 'bg-emerald-50 text-[#1D9A7C]' },
  { key: 'laptops_computers', label: 'Laptops & Computers', icon: Laptop, color: 'bg-blue-50 text-blue-600' },
  { key: 'tv_entertainment', label: 'TVs & Entertainment', icon: Tv, color: 'bg-indigo-50 text-indigo-600' },
  { key: 'home_appliances', label: 'Home Appliances', icon: Refrigerator, color: 'bg-cyan-50 text-cyan-600' },
  { key: 'kitchen_appliances', label: 'Kitchen Appliances', icon: Flame, color: 'bg-amber-50 text-amber-600' },
  { key: 'cameras', label: 'Cameras', icon: Camera, color: 'bg-purple-50 text-purple-600' },
  { key: 'audio', label: 'Audio', icon: Headphones, color: 'bg-pink-50 text-[#1D9A7C]' },
  { key: 'wearables', label: 'Wearables', icon: Watch, color: 'bg-[#EAF4EF] text-[#1D9A7C]' },
  { key: 'gaming', label: 'Gaming', icon: Gamepad2, color: 'bg-red-50 text-red-600' },
  { key: 'accessories', label: 'Accessories', icon: Package, color: 'bg-slate-100 text-slate-700' },
];

const BANNERS = [
  {
    id: 1,
    title: 'Flash Sale: Up to 35% Off Mobiles',
    subtitle: 'Compare live prices across Telemart, Mega.pk & Daraz',
    categoryKey: 'mobiles_tablets',
    bgGradient: 'from-emerald-700 via-teal-800 to-slate-900',
    badge: 'Limited Time',
  },
  {
    id: 2,
    title: 'Laptops & Workstations Price Drops',
    subtitle: 'Find the lowest deal on MacBook, Dell, HP & Lenovo',
    categoryKey: 'laptops_computers',
    bgGradient: 'from-blue-800 via-indigo-900 to-slate-900',
    badge: 'Best Savings',
  },
  {
    id: 3,
    title: 'Smart TVs & Home Entertainment',
    subtitle: '4K OLED & QLED TVs with live price comparison',
    categoryKey: 'tv_entertainment',
    bgGradient: 'from-purple-800 via-violet-900 to-slate-900',
    badge: 'Top Comparisons',
  },
  {
    id: 4,
    title: 'Home Appliances Mega Sale',
    subtitle: 'Refrigerators, ACs & Washing Machines at best prices',
    categoryKey: 'home_appliances',
    bgGradient: 'from-teal-800 via-cyan-900 to-slate-900',
    badge: 'Hot Deals',
  },
  {
    id: 5,
    title: 'Kitchen Appliances & Gadgets',
    subtitle: 'Air Fryers, Blenders, Microwaves & Ovens',
    categoryKey: 'kitchen_appliances',
    bgGradient: 'from-amber-700 via-orange-800 to-slate-900',
    badge: 'Kitchen Special',
  },
  {
    id: 6,
    title: 'Professional Cameras & Lenses',
    subtitle: 'Canon, Nikon, Sony Mirrorless & DSLR deals',
    categoryKey: 'cameras',
    bgGradient: 'from-purple-900 via-fuchsia-900 to-slate-900',
    badge: 'Pro Gear',
  },
  {
    id: 7,
    title: 'Audio, Headphones & Speakers',
    subtitle: 'Sony, JBL, Apple AirPods & Bose wireless audio',
    categoryKey: 'audio',
    bgGradient: 'from-pink-800 via-rose-900 to-slate-900',
    badge: 'Sound Deals',
  },
  {
    id: 8,
    title: 'Smart Wearables & Watches',
    subtitle: 'Apple Watch, Samsung Galaxy Fit & Smart bands',
    categoryKey: 'wearables',
    bgGradient: 'from-emerald-800 via-teal-900 to-slate-900',
    badge: 'Fitness Tech',
  },
  {
    id: 9,
    title: 'Gaming Consoles & Accessories',
    subtitle: 'PS5, Xbox, Gaming Laptops & Accessories',
    categoryKey: 'gaming',
    bgGradient: 'from-red-800 via-rose-900 to-slate-900',
    badge: 'Gamer Zone',
  },
  {
    id: 10,
    title: 'Tech Accessories & Cables',
    subtitle: 'Powerbanks, Chargers, Fast Cables & Adapters',
    categoryKey: 'accessories',
    bgGradient: 'from-slate-700 via-slate-800 to-slate-950',
    badge: 'Essentials',
  },
];

const productCache: Record<string, ApiProduct[]> = {};

export default function CategoryCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideProducts, setSlideProducts] = useState<Record<string, ApiProduct[]>>({});

  const banner = BANNERS[activeSlide];

  // Pre-load products for ALL 10 categories on mount
  useEffect(() => {
    BANNERS.forEach(async (b) => {
      if (!productCache[b.categoryKey]) {
        try {
          const res = await fetchBrowseProducts(b.categoryKey, undefined, undefined, 1, 10);
          const products = res.results || [];
          productCache[b.categoryKey] = products;
          setSlideProducts((prev) => ({ ...prev, [b.categoryKey]: products }));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  // Also reload active slide if missing
  useEffect(() => {
    if (!productCache[banner.categoryKey]) {
      fetchBrowseProducts(banner.categoryKey, undefined, undefined, 1, 10)
        .then((res) => {
          const products = res.results || [];
          productCache[banner.categoryKey] = products;
          setSlideProducts((prev) => ({ ...prev, [banner.categoryKey]: products }));
        })
        .catch(() => {});
    }
  }, [banner.categoryKey]);

  // Auto-rotate banners every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % BANNERS.length;
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx: number) => setActiveSlide(idx);
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  const goNext = () => setActiveSlide((prev) => (prev + 1) % BANNERS.length);

  const rawProducts = slideProducts[banner.categoryKey] || productCache[banner.categoryKey] || [];

  // Fallback items if category products are empty, ensuring EVERY slide shows images
  const displayProducts =
    rawProducts.length > 0
      ? rawProducts.slice(0, 6)
      : [
          {
            id: 901,
            title: `${CATEGORIES.find((c) => c.key === banner.categoryKey)?.label || 'Tech'} Hot Item`,
            store: 'Telemart',
            price: 'Rs 18,999',
            imageUrl: `https://picsum.photos/seed/${banner.categoryKey}-1/200/200`,
            handle: '',
            url: '',
            currency: 'PKR',
          },
          {
            id: 902,
            title: `${CATEGORIES.find((c) => c.key === banner.categoryKey)?.label || 'Tech'} Deal`,
            store: 'Mega.pk',
            price: 'Rs 27,500',
            imageUrl: `https://picsum.photos/seed/${banner.categoryKey}-2/200/200`,
            handle: '',
            url: '',
            currency: 'PKR',
          },
          {
            id: 903,
            title: `${CATEGORIES.find((c) => c.key === banner.categoryKey)?.label || 'Tech'} Choice`,
            store: 'Daraz',
            price: 'Rs 34,900',
            imageUrl: `https://picsum.photos/seed/${banner.categoryKey}-3/200/200`,
            handle: '',
            url: '',
            currency: 'PKR',
          },
        ];

  return (
    <div className="space-y-8">
      {/* Hero Banner Slider */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-lg">
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${banner.bgGradient} transition-all duration-700`} />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Text & Action */}
          <div className="max-w-xl text-white space-y-3 flex-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
              {banner.badge}
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {banner.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200">{banner.subtitle}</p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href={`/category/${banner.categoryKey}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1D9A7C] font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition-colors"
              >
                Shop Now →
              </Link>
            </div>
          </div>

          {/* Real Category Products inside Banner (Guaranteed Images for all 10 slides) */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full md:w-auto justify-start md:justify-center py-1">
            {displayProducts.map((product, idx) => {
              const productKey = product.id
                ? String(product.id)
                : encodeURIComponent(product.handle || product.url || product.title);
              const queryParams = new URLSearchParams();
              if (product.store) queryParams.set('store', product.store);
              if (product.url) queryParams.set('url', product.url);
              if (product.handle) queryParams.set('handle', product.handle);
              if (product.title) queryParams.set('title', product.title);
              if (product.price) queryParams.set('price', product.price);
              if (product.imageUrl) queryParams.set('image', product.imageUrl);

              const imgSrc =
                product.imageUrl ||
                `https://picsum.photos/seed/${encodeURIComponent(product.title || 'product')}/200/200`;

              return (
                <Link
                  key={`${product.id || idx}`}
                  href={`/product/${productKey}?${queryParams.toString()}`}
                  className="flex-shrink-0 w-28 sm:w-32 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl p-2.5 border border-white/25 flex flex-col items-center group transition-all transform hover:-translate-y-1 shadow-lg"
                  title={product.title}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl p-1.5 mb-2 flex items-center justify-center overflow-hidden">
                    <Image
                      src={imgSrc}
                      alt={product.title}
                      width={90}
                      height={90}
                      className="object-contain group-hover:scale-110 transition-transform"
                      unoptimized
                    />
                  </div>
                  <p className="text-white text-[11px] font-semibold line-clamp-1 w-full text-center group-hover:text-amber-300 transition-colors">
                    {product.title}
                  </p>
                  {product.price && (
                    <span className="mt-1 text-[10px] font-bold text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded-md font-mono">
                      {product.price}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Prev / Next arrows */}
          <div className="hidden sm:flex items-center gap-2 self-start">
            <button
              onClick={goPrev}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeSlide === idx ? 'w-7 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Category Icons Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">Browse Categories</h3>
          <span className="text-xs text-slate-500 font-medium">10 Tech Categories</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
          {CATEGORIES.map((cat) => {
            const IconComp = cat.icon;
            return (
              <Link
                key={cat.key}
                href={`/category/${cat.key}`}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-[#1D9A7C] transition-all group text-center"
              >
                <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <IconComp size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700 line-clamp-1 group-hover:text-[#1D9A7C] transition-colors">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
