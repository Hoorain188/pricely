'use client';

import React from 'react';

export interface SegmentedControlOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function SegmentedControl({
  options,
  activeKey,
  onChange,
  className = '',
}: SegmentedControlProps) {
  return (
    <div
      className={`flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 gap-1 ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.key === activeKey;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-[#1D9A7C] shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
