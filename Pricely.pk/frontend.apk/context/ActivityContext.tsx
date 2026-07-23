import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuthStore } from './AuthContext';

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
}

interface ActivityContextValue {
  entries: ActivityEntry[];
  logActivity: (action: string) => void;
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([
    { id: 'e1', actor: 'Hoorain', action: 'Merged "iPhone 15 Pro 256GB" duplicate group', timestamp: '2 hours ago' },
    { id: 'e2', actor: 'Bilal', action: 'Re-ran the Telemart scraper', timestamp: 'Yesterday' },
    { id: 'e3', actor: 'Hoorain', action: "Changed Ayesha's role to Support", timestamp: '3 days ago' },
  ]);
  const { user } = useAuthStore();

  const logActivity = (action: string) => {
    setEntries((prev) => [
      { id: `e-${Date.now()}`, actor: user?.name ?? 'Someone', action, timestamp: 'just now' },
      ...prev,
    ]);
    // TODO: call your log-activity API here
  };

  return <ActivityContext.Provider value={{ entries, logActivity }}>{children}</ActivityContext.Provider>;
}

export function useActivityStore() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivityStore must be used within an ActivityProvider');
  return ctx;
}
