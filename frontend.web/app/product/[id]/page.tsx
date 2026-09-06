'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, ShieldCheck, Info, ChevronRight } from 'lucide-react';
import LottieLoader from '../../../components/LottieLoader';
import LottieBackButton from '../../../components/LottieBackButton';
import CompareSection from '../../../components/CompareSection';
import PriceHistoryChart from '../../../components/PriceHistoryChart';
import StoreBadge from '../../../components/StoreBadge';
import {
  fetchProductDetail,
  fetchCompare,
  fetchPriceHistory,
  ProductDetail,
  CompareResponse,
  PriceHistoryResponse,
  formatPrice,
} from '../../../services/api';

function ProductDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();

  const productId = resolvedParams.id;
  const storeParam = searchParams.get('store') || '';
  const urlParam = searchParams.get('url') || '';
  const handleParam = searchParams.get('handle') || productId;
  const titleParam = searchParams.get('title') || '';
  const priceParam = searchParams.get('price') || '';
  const imageParam = searchParams.get('image') || '';

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [historyData, setHistoryData] = useState<PriceHistoryResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function loadAllData() {
      setLoading(true);
      try {
        const numericId = parseInt(productId, 10);
        const validId = !isNaN(numericId) && numericId > 0 ? numericId : undefined;

        // Fetch parallel
        const [detailRes, compareRes, historyRes] = await Promise.all([
          fetchProductDetail(handleParam, storeParam, urlParam),
          fetchCompare(validId, titleParam || handleParam),
          validId ? fetchPriceHistory(validId) : Promise.resolve(null),
        ]);

        if (active) {
          if (detailRes) {
            setDetail(detailRes);
            const imgs = detailRes.images || [];
            setSelectedImage(imgs[0] || imageParam);
          } else {
            // Fallback product detail from query params
            setDetail({
              title: titleParam || 'Product Detail',
              store: storeParam || 'Store',
              description: '',
              brand: storeParam || 'Brand',
              images: imageParam ? [imageParam] : [],
              url: urlParam || '#',
            });
            setSelectedImage(imageParam);
          }

          setCompareData(compareRes);
          setHistoryData(historyRes);
        }
      } catch (err) {
        console.warn('Product detail error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAllData();

    return () => {
      active = false;
    };
  }, [productId, storeParam, urlParam, handleParam, titleParam, imageParam]);

  if (loading) {
    return (
      <div className="py-16">
        <LottieLoader size={90} text="Loading product details & comparing store prices..." />
      </div>
    );
  }

  const productTitle = detail?.title || titleParam || 'Product Detail';
  const productPrice = detail?.variants?.[0]?.price || priceParam || '0';
  const storeName = detail?.store || storeParam || 'Store';
  const mainImages = detail?.images && detail.images.length > 0 ? detail.images : [imageParam].filter(Boolean);
  const displayImage = selectedImage || mainImages[0] || `https://picsum.photos/seed/${encodeURIComponent(productTitle)}/400/400`;

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
        <LottieBackButton size={28} />
        <Link href="/" className="hover:text-[#1D9A7C]">Home</Link>
        <ChevronRight size={12} />
        <Link href="/category/mobiles_tablets" className="hover:text-[#1D9A7C]">Products</Link>
        <ChevronRight size={12} />
        <span className="text-slate-800 font-bold truncate max-w-xs">{productTitle}</span>
      </div>

      {/* Top Product Section: Images + Info */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="relative w-full h-72 sm:h-96 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center p-4">
            <Image
              src={displayImage}
              alt={productTitle}
              fill
              className="object-contain p-4"
              unoptimized
            />
          </div>

          {/* Thumbnails Carousel */}
          {mainImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {mainImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(imgUrl)}
                  type="button"
                  className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden bg-slate-50 shrink-0 transition-all cursor-pointer ${
                    selectedImage === imgUrl ? 'border-[#1D9A7C] ring-2 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Price */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StoreBadge store={storeName} className="px-3 py-1 text-xs" />
              {detail?.brand && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                  {detail.brand}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {productTitle}
            </h1>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700 block">
                  Store Price ({storeName})
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1D9A7C] font-mono">
                  {formatPrice(productPrice)}
                </span>
              </div>

              {(detail?.url || urlParam) && (
                <a
                  href={detail?.url || urlParam || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9A7C] hover:bg-[#0E6B4F] text-white font-bold text-xs shadow-sm transition-all"
                >
                  Visit Store
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck className="text-[#1D9A7C]" size={16} />
              Multi-Store Guarantee
            </div>
            <p>
              Compare live prices across Telemart, Mega.pk and Daraz. We track history to ensure you never overpay.
            </p>
          </div>
        </div>
      </div>

      {/* Compare Prices Across Stores Section */}
      <CompareSection
        offers={compareData?.offers || []}
        lowestPrice={compareData?.lowestPrice}
      />

      {/* Price History Section (Hidden if hasHistory is false) */}
      {historyData?.hasHistory && (
        <PriceHistoryChart
          points={historyData.points}
          currentPrice={historyData.currentPrice}
          lowestPrice={historyData.lowestPrice}
          highestPrice={historyData.highestPrice}
          averagePrice={historyData.averagePrice}
          hasHistory={historyData.hasHistory}
        />
      )}

      {/* Specs / Description / Daraz View Full Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Product Details & Specifications
        </h3>

        {/* Specs Array for Mega.pk */}
        {detail?.specs && detail.specs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detail.specs.map((spec, i) => (
              <div key={i} className="flex justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                <span className="font-semibold text-slate-500">{spec.label}</span>
                <span className="font-medium text-slate-800 text-right">{spec.value}</span>
              </div>
            ))}
          </div>
        ) : detail?.description ? (
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {detail.description}
          </p>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-center space-y-3">
            <Info size={24} className="text-orange-500 mx-auto" />
            <p className="text-xs text-orange-800 font-medium">
              View complete product details, full specifications, key features, and verified customer reviews on Daraz.pk.
            </p>
            <a
              href={detail?.viewOnStoreUrl || detail?.url || urlParam || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F57224] hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-colors"
            >
              View Full Details on Daraz
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LottieLoader size={90} text="Loading product detail..." />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
