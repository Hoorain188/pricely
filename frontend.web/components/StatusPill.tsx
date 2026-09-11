'use client';

import React from 'react';

export interface StatusPillProps {
  status: 'ok' | 'fail' | 'live' | 'syncing' | string;
  label?: string;
  className?: string;
}

export default function StatusPill({ status, label, className = '' }: StatusPillProps) {
  const isOk = status === 'ok' || status === 'live';
  const isSyncing = status === 'syncing';

  const defaultText = label || status.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide transition-colors ${
        isSyncing
          ? 'bg-amber-100 text-amber-800 border border-amber-200'
          : isOk
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSyncing
            ? 'bg-amber-500 animate-ping'
            : isOk
            ? 'bg-emerald-500 animate-pulse'
            : 'bg-rose-500'
        }`}
      />
      {defaultText}
    </span>
  );
}
