'use client';

import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export interface GradientButtonProps {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export default function GradientButton({
  label,
  onClick,
  loading = false,
  disabled = false,
  className = '',
  icon,
  type = 'button',
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm text-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 active:scale-97 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-[#1D9A7C] via-[#16856a] to-[#0E6B4F] hover:from-[#16856a] hover:to-[#094d38] w-full ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Please wait…</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{label}</span>
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform duration-200 shrink-0"
          />
        </>
      )}
    </button>
  );
}

