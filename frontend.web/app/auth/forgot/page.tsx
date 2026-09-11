'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi, ApiError } from '../../../services/api';
import GradientButton from '../../../components/GradientButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1D9A7C] text-white font-extrabold text-xl flex items-center justify-center shadow-lg">P</div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Pricely<span className="text-[#1D9A7C]">.pk</span></span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-7">
          <Link href="/auth" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors">
            <ArrowLeft size={15} />
            Back to sign in
          </Link>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-600" size={28} />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-slate-500 mb-6">
                We sent a password reset code to <strong>{email}</strong>.
              </p>
              <Link
                href={`/auth/verify?email=${encodeURIComponent(email)}&flow=reset`}
                className="inline-block px-6 py-2.5 bg-[#1D9A7C] text-white rounded-xl font-bold text-sm hover:bg-[#0E6B4F] transition-colors"
              >
                Enter Reset Code →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900 mb-1">Forgot password?</h1>
              <p className="text-xs text-slate-400 mb-5">
                Enter your email address and we&apos;ll send you a reset code.
              </p>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                />
              </div>

              <GradientButton
                label={loading ? 'Sending...' : 'Send Reset Code'}
                type="submit"
                disabled={loading}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
