'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { authApi, isAuthResponse, ApiError } from '../../../services/api';
import { useAuth } from '../../context/AuthContext';
import GradientButton from '../../../components/GradientButton';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const email = searchParams.get('email') || '';
  const flow = (searchParams.get('flow') || 'reset') as 'signup' | 'reset';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleDigitChange = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    if (cleaned && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const code = digits.join('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }
    setError(null);
    setLoading(true);
    try {
      if (flow === 'signup') {
        const res = await authApi.verifySignup(email, code);
        if (isAuthResponse(res)) {
          await setAuth(res.user, res.accessToken, res.refreshToken);
          router.push('/');
        } else {
          router.push('/auth?approved=pending');
        }
      } else {
        // For reset flow, just verify the code then go to reset page
        await authApi.verifyResetCode(email, code);
        router.push(`/auth/reset?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await authApi.resendCode(email, flow === 'signup' ? 'Signup' : 'PasswordReset');
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1D9A7C] text-white font-extrabold text-xl flex items-center justify-center shadow-lg">P</div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Pricely<span className="text-[#1D9A7C]">.pk</span></span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-7">
          <Link
            href={flow === 'signup' ? '/auth' : '/auth/forgot'}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-semibold mb-6 transition-colors"
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          <h1 className="text-xl font-extrabold text-slate-900 mb-1">Enter verification code</h1>
          <p className="text-xs text-slate-400 mb-6">
            We sent a 6-digit code to <strong className="text-slate-600">{email || 'your email'}</strong>.
            {flow === 'signup' ? ' Verify your account to continue.' : ' Enter the code to reset your password.'}
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resent && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold text-center">
              ✓ Code resent successfully!
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* OTP Digits */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-extrabold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#1D9A7C] ${
                    d ? 'border-[#1D9A7C] bg-emerald-50 text-[#1D9A7C]' : 'border-slate-200 text-slate-900 bg-slate-50'
                  }`}
                />
              ))}
            </div>

            <GradientButton
              label={loading ? 'Verifying...' : 'Verify Code'}
              type="submit"
              disabled={loading || code.length < 6}
            />

            <div className="text-center">
              <p className="text-xs text-slate-400 mb-2">Didn&apos;t receive the code?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D9A7C] hover:underline disabled:opacity-50"
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
