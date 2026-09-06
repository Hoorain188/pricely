'use client';

import React from 'react';

export type RoleType = 'admin' | 'support' | 'readonly' | 'customer' | 'user';

const CONFIG: Record<RoleType, { label: string; bg: string; text: string; border: string }> = {
  admin:    { label: 'Admin',     bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  support:  { label: 'Support',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200'  },
  readonly: { label: 'Read-only', bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200'  },
  customer: { label: 'Customer',  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200'},
  user:     { label: 'User',      bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200'   },
};

interface RolePillProps {
  role: string;
  className?: string;
}

export default function RolePill({ role, className = '' }: RolePillProps) {
  const cfg = CONFIG[role as RoleType] ?? CONFIG.readonly;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
