import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1D9A7C] text-white font-extrabold text-lg flex items-center justify-center">
                P
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Pricely<span className="text-[#1D9A7C]">.pk</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pakistan&apos;s leading multi-store price comparison platform. Compare prices live across Telemart, Mega.pk, and Daraz to find the lowest deals.
            </p>
          </div>

          {/* Top Categories */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/category/mobiles_tablets" className="hover:text-[#1D9A7C] transition-colors">
                  Mobiles & Tablets
                </Link>
              </li>
              <li>
                <Link href="/category/laptops_computers" className="hover:text-[#1D9A7C] transition-colors">
                  Laptops & Computers
                </Link>
              </li>
              <li>
                <Link href="/category/tv_entertainment" className="hover:text-[#1D9A7C] transition-colors">
                  TVs & Entertainment
                </Link>
              </li>
              <li>
                <Link href="/category/home_appliances" className="hover:text-[#1D9A7C] transition-colors">
                  Home Appliances
                </Link>
              </li>
              <li>
                <Link href="/category/gaming" className="hover:text-[#1D9A7C] transition-colors">
                  Gaming Consoles
                </Link>
              </li>
            </ul>
          </div>

          {/* Top Stores */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Supported Stores
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/category/mobiles_tablets?store=Telemart" className="hover:text-[#1D9A7C] transition-colors">
                  Telemart.pk
                </Link>
              </li>
              <li>
                <Link href="/category/mobiles_tablets?store=Mega.pk" className="hover:text-[#1D9A7C] transition-colors">
                  Mega.pk
                </Link>
              </li>
              <li>
                <Link href="/category/mobiles_tablets?store=Daraz" className="hover:text-[#1D9A7C] transition-colors">
                  Daraz.pk
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/deals" className="hover:text-[#1D9A7C] transition-colors">
                  Price Drop Deals
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-[#1D9A7C] transition-colors">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="hover:text-[#1D9A7C] transition-colors">
                  Price Alert Notifications
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#1D9A7C] transition-colors">
                  Account Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Pricely.pk. All rights reserved.</p>
          <p className="text-[11px] text-slate-500">
            Price comparison engine connected to Railway live API.
          </p>
        </div>
      </div>
    </footer>
  );
}
