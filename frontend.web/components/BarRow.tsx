'use client';

import React from 'react';

export interface BarRowProps {
  label: string;
  value: string;
  percent: number;
  color?: string; // tailwind bg class or hex
}

export default function BarRow({ label, value, percent, color }: BarRowProps) {
  const barColor = color ?? '#1D9A7C';

  return (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">{label}</span>
        <span className="text-xs font-bold font-mono text-slate-900 shrink-0 ml-2">{value}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
