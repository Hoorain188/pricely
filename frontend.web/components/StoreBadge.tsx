import React from 'react';

interface StoreBadgeProps {
  store?: string;
  className?: string;
}

export default function StoreBadge({ store, className = '' }: StoreBadgeProps) {
  if (!store) return null;

  const storeClean = store.toLowerCase().trim();

  let bgColor = 'bg-emerald-50 text-emerald-700';
  let textColor = 'text-emerald-700';

  if (storeClean.includes('daraz')) {
    bgColor = 'bg-[#FFF0E6]';
    textColor = 'text-[#F57224]';
  } else if (storeClean.includes('telemart')) {
    bgColor = 'bg-[#EAF4EF]';
    textColor = 'text-[#1D9A7C]';
  } else if (storeClean.includes('mega')) {
    bgColor = 'bg-[#E7EEFC]';
    textColor = 'text-[#2F6FB0]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${bgColor} ${textColor} ${className}`}
    >
      {store}
    </span>
  );
}

export function CompareBadge({ text = '2+ stores', className = '' }: { text?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E6F9F0] border border-[#10B981] text-[#059669] ${className}`}
    >
      {text}
    </span>
  );
}

export function PriceDropBadge({ text = 'Price Drop', className = '' }: { text?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF2F2] border border-[#EF4444] text-[#DC2626] ${className}`}
    >
      📉 {text}
    </span>
  );
}
