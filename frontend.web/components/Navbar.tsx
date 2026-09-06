'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Heart, Tag, Shield, LogOut, User } from 'lucide-react';
import SidebarDrawer from './SidebarDrawer';
import LottieSearchIcon from './LottieSearchIcon';
import { useAuth } from '../app/context/AuthContext';

export default function Navbar() {
  const router = useRouter();
  const { user, clearAuth } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isAdminUser = user && (user.role === 'admin' || user.role === 'support' || user.role === 'readonly');
  const initials = user
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#1D9A7C] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
            {/* Left: Hamburger & Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                type="button"
                className="p-2 rounded-lg hover:bg-white/15 transition-colors text-white cursor-pointer"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>

              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-white text-[#1D9A7C] font-extrabold text-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  P
                </div>
                <span className="font-extrabold text-xl tracking-tight hidden sm:inline-block">
                  Pricely<span className="text-emerald-200">.pk</span>
                </span>
              </Link>
            </div>

            {/* Center: Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
              <div className="relative flex items-center w-full">
                <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                  <LottieSearchIcon active={searchQuery.length > 0} size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands or stores (e.g. iPhone, Laptop, Redmi)..."
                  className="w-full pl-10 pr-10 py-2 rounded-full bg-white/95 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            {/* Right: Nav Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/deals"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
              >
                <Tag size={15} className="text-amber-300" />
                Deals
              </Link>

              <Link
                href="/favorites"
                className="p-2 rounded-full hover:bg-white/15 transition-colors relative"
                title="Wishlist"
              >
                <Heart size={20} />
              </Link>

              {/* Admin link */}
              {isAdminUser && (
                <Link
                  href="/admin"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
                  title="Admin Panel"
                >
                  <Shield size={15} className="text-violet-300" />
                  Admin
                </Link>
              )}

              {/* Auth state */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-white/15 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-extrabold">
                      {initials}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      {isAdminUser && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Shield size={15} className="text-violet-500" />
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User size={15} className="text-slate-400" />
                        My Account
                      </Link>
                      <button
                        onClick={() => { clearAuth(); setUserMenuOpen(false); router.push('/'); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#1D9A7C] font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Category & Store Quick Bar for Desktop */}
        <div className="hidden sm:block bg-[#0E6B4F] text-emerald-100 text-xs py-2 px-4 border-t border-emerald-600/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-4 no-scrollbar">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <Link href="/category/mobiles_tablets" className="hover:text-white transition-colors">Mobiles</Link>
              <Link href="/category/laptops_computers" className="hover:text-white transition-colors">Laptops</Link>
              <Link href="/category/tv_entertainment" className="hover:text-white transition-colors">TVs</Link>
              <Link href="/category/audio" className="hover:text-white transition-colors">Audio</Link>
              <Link href="/category/wearables" className="hover:text-white transition-colors">Wearables</Link>
              <Link href="/category/gaming" className="hover:text-white transition-colors">Gaming</Link>
              <Link href="/category/home_appliances" className="hover:text-white transition-colors">Appliances</Link>
            </div>

            <div className="flex items-center gap-3 whitespace-nowrap border-l border-emerald-500/30 pl-4">
              <span className="font-semibold text-emerald-200">Stores:</span>
              <Link href="/category/mobiles_tablets?store=Telemart" className="px-2 py-0.5 rounded bg-[#1D9A7C] text-white hover:bg-emerald-600 font-semibold text-[11px]">Telemart</Link>
              <Link href="/category/mobiles_tablets?store=Mega.pk" className="px-2 py-0.5 rounded bg-[#2F6FB0] text-white hover:bg-blue-700 font-semibold text-[11px]">Mega.pk</Link>
              <Link href="/category/mobiles_tablets?store=Daraz" className="px-2 py-0.5 rounded bg-[#F57224] text-white hover:bg-orange-600 font-semibold text-[11px]">Daraz</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Slide-Over Drawer */}
      <SidebarDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}


