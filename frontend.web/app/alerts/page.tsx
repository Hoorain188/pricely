import React from 'react';
import Link from 'next/link';
import { Bell, Lock, ArrowLeft } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="bg-white border border-[#1D9A7C]/20 rounded-3xl p-8 shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1D9A7C] flex items-center justify-center mx-auto">
          <Bell size={32} />
        </div>

        <h1 className="text-xl font-bold text-slate-900">Price Drop Alerts</h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
          <Lock size={13} />
          Sign in required — Coming Soon
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Set custom target price alerts and get notified instantly via email or push notifications when prices drop across store listings.
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D9A7C] hover:bg-[#0E6B4F] text-white font-bold text-xs shadow-xs transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
