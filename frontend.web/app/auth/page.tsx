'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, User, Eye, EyeOff, Lock, Mail, UserCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi, isAuthResponse, ApiError } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import GradientButton from '../../components/GradientButton';

type Mode = 'login' | 'signup';
type Role = 'admin' | 'user';

const ROLES = [
  { key: 'user' as Role,  title: 'USER',  subtitle: 'Browse & compare prices', icon: User },
  { key: 'admin' as Role, title: 'ADMIN', subtitle: 'Manage store data', icon: Shield },
];

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('user');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup-only
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Email and password required.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password, 'Web Browser');
      await setAuth(res.user, res.accessToken, res.refreshToken);
      if (res.user.role === 'admin' || res.user.role === 'support' || res.user.role === 'readonly') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.signup(name.trim(), email.trim(), password, role);
      if (isAuthResponse(res)) {
        await setAuth(res.user, res.accessToken, res.refreshToken);
        router.push('/');
      } else {
        // Pending approval (admin signup)
        setPendingEmail(email.trim());
        setPendingApproval(true);
      }
    } catch (err) {
      // Backend might require email verification first
      if (err instanceof ApiError && err.status === 200) {
        setPendingEmail(email.trim());
        setSignupSuccess(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-amber-600" size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Request Submitted</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Your admin access request has been sent to the Pricely team.
              You&apos;ll be able to sign in once an existing admin approves it.
            </p>
            <GradientButton label="Back to Sign In" onClick={() => { setPendingApproval(false); setMode('login'); }} />
          </div>
        </div>
      </div>
    );
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Verify Your Email</h1>
          <p className="text-sm text-slate-500 mb-4">
            We sent a verification code to <strong>{pendingEmail}</strong>. Please check your inbox.
          </p>
          <Link
            href={`/auth/verify?email=${encodeURIComponent(pendingEmail)}&flow=signup`}
            className="inline-block px-6 py-2.5 bg-[#1D9A7C] text-white rounded-xl font-bold text-sm hover:bg-[#0E6B4F] transition-colors"
          >
            Enter Verification Code →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1D9A7C] text-white font-extrabold text-xl flex items-center justify-center shadow-lg">
              P
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              Pricely<span className="text-[#1D9A7C]">.pk</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">Pakistan&apos;s smartest price comparison</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex border-b border-slate-100">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-all ${
                  mode === m
                    ? 'text-[#1D9A7C] border-b-2 border-[#1D9A7C] bg-emerald-50/50'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {/* Role Selector */}
            <div className="flex gap-2 mb-6">
              {ROLES.map(({ key, title, subtitle, icon: Icon }) => {
                const active = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-[#1D9A7C] bg-emerald-50 text-[#1D9A7C]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[#1D9A7C]' : 'text-slate-400'} />
                    <div>
                      <div className={`text-[11px] font-extrabold tracking-wide ${active ? 'text-[#1D9A7C]' : 'text-slate-500'}`}>{title}</div>
                      <div className="text-[10px] text-slate-400">{subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">Welcome back</h2>
                <p className="text-xs text-slate-400 mb-5">Sign in to your Pricely account</p>

                {/* Email */}
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link href="/auth/forgot" className="text-xs text-[#1D9A7C] font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <GradientButton label={loading ? 'Signing in...' : 'Sign In'} type="submit" disabled={loading} />

                <p className="text-center text-xs text-slate-400 pt-1">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-[#1D9A7C] font-bold hover:underline">
                    Create one
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">Create your account</h2>
                <p className="text-xs text-slate-400 mb-5">Join Pricely and start comparing prices</p>

                {/* Name */}
                <div className="relative">
                  <UserCircle size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min. 8 characters)"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] focus:border-transparent transition-all bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <GradientButton label={loading ? 'Creating account...' : 'Create Account'} type="submit" disabled={loading} />

                <p className="text-center text-xs text-slate-400 pt-1">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="text-[#1D9A7C] font-bold hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By continuing you agree to our{' '}
          <span className="text-[#1D9A7C] font-semibold cursor-pointer hover:underline">Terms</span> &amp;{' '}
          <span className="text-[#1D9A7C] font-semibold cursor-pointer hover:underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
