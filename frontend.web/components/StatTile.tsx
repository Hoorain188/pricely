'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export interface StatTileProps {
  value: string | number;
  label: string;
  trend?: string;
  warn?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function StatTile({
  value,
  label,
  trend,
  warn = false,
  onClick,
  className = '',
}: StatTileProps) {
  const content = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${
              warn ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {value}
          </span>
          {warn && <AlertTriangle size={18} className="text-rose-500 shrink-0" />}
        </div>
        <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{label}</p>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {warn ? (
            <TrendingDown size={14} className="text-rose-500 shrink-0" />
          ) : (
            <TrendingUp size={14} className="text-[#1D9A7C] shrink-0" />
          )}
          <span
            className={`text-[11px] font-bold ${
              warn ? 'text-rose-600' : 'text-[#1D9A7C]'
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );

  const containerClasses = `p-4 rounded-2xl border transition-all duration-200 ${
    warn
      ? 'bg-rose-50/50 border-rose-200/80 hover:border-rose-300'
      : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md'
  } ${onClick ? 'cursor-pointer active:scale-98' : ''} ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`text-left w-full ${containerClasses}`}>
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}
