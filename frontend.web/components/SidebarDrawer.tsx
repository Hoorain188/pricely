'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Home,
  Tag,
  Heart,
  Bell,
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
  HelpCircle,
  Settings,
  Store,
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LINKS = [
  { key: 'mobiles_tablets', label: 'Mobiles & Tablets', icon: Smartphone },
  { key: 'laptops_computers', label: 'Laptops & Computers', icon: Laptop },
  { key: 'tv_entertainment', label: 'TVs & Entertainment', icon: Tv },
  { key: 'home_appliances', label: 'Home Appliances', icon: Refrigerator },
  { key: 'kitchen_appliances', label: 'Kitchen Appliances', icon: Flame },
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'audio', label: 'Audio', icon: Headphones },
  { key: 'wearables', label: 'Wearables', icon: Watch },
  { key: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { key: 'accessories', label: 'Accessories', icon: Package },
];

const STORE_LINKS = [
  { name: 'Telemart', slug: 'Telemart', color: '#1D9A7C', bg: '#EAF4EF' },
  { name: 'Mega.pk', slug: 'Mega.pk', color: '#2F6FB0', bg: '#E7EEFC' },
  { name: 'Daraz', slug: 'Daraz', color: '#F57224', bg: '#FFF0E6' },
];

export default function SidebarDrawer({ isOpen, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-[#1D9A7C] to-[#0E6B4F] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              P
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-wide leading-none">Pricely.pk</h2>
              <p className="text-xs text-emerald-100 mt-1">Smart Price Comparison</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-6 flex-1">
          {/* Main Links */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Menu
            </p>
            <Link
              href="/"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/' ? 'bg-[#EAF4EF] text-[#1D9A7C]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Home size={18} />
              Home
            </Link>
            <Link
              href="/deals"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/deals' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Tag size={18} className="text-[#DC2626]" />
              Price Drop Deals
            </Link>
            <Link
              href="/favorites"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/favorites' ? 'bg-[#EAF4EF] text-[#1D9A7C]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart size={18} />
              Favorites
            </Link>
            <Link
              href="/alerts"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/alerts' ? 'bg-[#EAF4EF] text-[#1D9A7C]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bell size={18} />
              Price Alerts
            </Link>
          </div>

          {/* Shop by Store */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Stores
            </p>
            <div className="space-y-1.5">
              {STORE_LINKS.map((st) => (
                <Link
                  key={st.name}
                  href={`/category/mobiles_tablets?store=${st.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Store size={16} style={{ color: st.color }} />
                    <span className="text-sm font-medium text-slate-700">{st.name}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    Browse
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Categories
            </p>
            <div className="space-y-1">
              {CATEGORY_LINKS.map((cat) => {
                const IconComponent = cat.icon;
                const active = pathname.includes(`/category/${cat.key}`);
                return (
                  <Link
                    key={cat.key}
                    href={`/category/${cat.key}`}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-[#EAF4EF] text-[#1D9A7C]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <IconComponent size={18} />
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Settings & Support */}
          <div className="pt-4 border-t border-slate-100 space-y-1">
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Settings size={18} />
              Account & Settings
            </Link>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
          Pricely.pk Web v1.0 • Connected to Live Production API
        </div>
      </div>
    </div>
  );
}
