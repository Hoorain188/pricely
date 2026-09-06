'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, NotificationPrefs, ApiError } from '../../../services/api';
import { useAuth } from '../../context/AuthContext';
import Toggle from '../../../components/Toggle';
import RolePill from '../../../components/RolePill';

const DEFAULT_PREFS: NotificationPrefs = { newReports: true, syncFailures: true, weeklySummaryEmail: false };

export default function AdminSettingsPage() {
  const { user, clearAuth } = useAuth();
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prefsRes, teamRes] = await Promise.all([
        adminApi.notificationPrefs(),
        adminApi.team(),
      ]);
      setPrefs(prefsRes);
      setTeamCount(teamRes.totalCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load settings.');
    } finally {
      setReady(true);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const run = async () => { await load(); };
    void run();
  }, [load]);

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(null);
    setSaveSuccess(false);
    try {
      setPrefs(await adminApi.updateNotificationPrefs(next));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof ApiError ? err.message : 'Could not save that setting.');
    }
  };

  const initials = (user?.name ?? 'Admin')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your preferences and account</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-base">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">{user?.name ?? 'Admin'}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2">
            <RolePill role={user?.role === 'user' || !user ? 'admin' : user.role} />
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>}
      {saveSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">✓ Saved</div>}

      {/* Notifications */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-3">Notifications</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {[
            { key: 'newReports' as const, label: 'New reports' },
            { key: 'syncFailures' as const, label: 'Sync failures' },
            { key: 'weeklySummaryEmail' as const, label: 'Weekly summary email' },
          ].map(({ key, label }, i) => (
            <div key={key} className={`flex items-center justify-between px-5 py-4 ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
              <span className="text-sm font-medium text-slate-900">{label}</span>
              <Toggle value={prefs[key]} onValueChange={(v) => void handleToggle(key, v)} disabled={!ready} />
            </div>
          ))}
          <div
            className="flex items-center justify-between px-5 py-4 border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => router.push('/admin/reports')}
          >
            <span className="text-sm font-medium text-slate-900">View reports</span>
            <span className="text-xs text-slate-400">Weekly · monthly · yearly ›</span>
          </div>
        </div>
      </div>

      {/* Team & Security */}
      {user?.role !== 'readonly' && (
        <div>
          <h2 className="text-base font-extrabold text-slate-900 mb-3">Team & security</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => router.push('/admin/users')}
            >
              <span className="text-sm font-medium text-slate-900">Manage team access</span>
              <span className="text-xs text-slate-400">
                {teamCount === null ? '…' : `${teamCount} member${teamCount === 1 ? '' : 's'}`} ›
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-900">Two-factor authentication</span>
              <span className="text-xs text-slate-400 italic">Coming soon</span>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => { clearAuth(); router.push('/auth'); }}
        className="w-full py-3.5 rounded-2xl border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
