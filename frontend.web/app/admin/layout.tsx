'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Copy,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RolePill from '../../components/RolePill';

const NAV_ITEMS = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/users',      label: 'Users',       icon: Users          },
  { href: '/admin/duplicates', label: 'Duplicates',  icon: Copy           },
  { href: '/admin/reports',    label: 'Reports',     icon: BarChart3      },
  { href: '/admin/settings',   label: 'Settings',    icon: Settings       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, clearAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'support' && user.role !== 'readonly'))) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-[#1D9A7C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#1D9A7C] text-white font-extrabold text-base flex items-center justify-center shadow group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Pricely<span className="text-[#1D9A7C]">.pk</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 mt-2.5">
            <Shield size={13} className="text-violet-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-50 text-[#1D9A7C] border border-emerald-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-[#1D9A7C]' : 'text-slate-400 group-hover:text-slate-600'} />
                {label}
                {isActive && <ChevronRight size={14} className="ml-auto text-[#1D9A7C]" />}
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-extrabold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <RolePill role={user.role} className="mb-3" />
          <button
            onClick={() => { clearAuth(); router.push('/auth'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors border border-rose-100"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1D9A7C] text-white font-extrabold text-sm flex items-center justify-center">P</div>
          <span className="font-extrabold text-base text-slate-900">Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <RolePill role={user.role} />
          <button onClick={() => { clearAuth(); router.push('/auth'); }} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[#1D9A7C]' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:p-8 p-4 pt-16 pb-20 md:pt-8 md:pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
