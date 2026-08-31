/**
 * One place for the API base URL and every admin call.
 *
 * The origin comes from config/api.ts, which reuses the address Expo is
 * already serving the bundle from — the laptop's address on this WiFi — so
 * there is no IP to update when the network changes. Set EXPO_PUBLIC_API_URL
 * to override it (a deployed URL, or a tunnel).
 *
 * Note the /api/v1 suffix is added here. Auth calls sit at /api/auth and use
 * the bare origin, so the two must not share a pre-suffixed variable.
 */
import { API_BASE_URL } from '../../config/api';

const BASE = `${API_BASE_URL}/api/v1`;

/**
 * The signed-in admin's access token. AuthContext keeps this in step on
 * login, logout and startup, so every admin call carries proof of identity.
 *
 * This replaces a hardcoded X-Actor-Id header, which named the actor with a
 * plain user id the client chose for itself — spoofable by anyone, and no
 * longer accepted: the server now reads the "sub" claim off the verified
 * token instead.
 */
let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Give up rather than hang forever on a dead network. 60s, not 15s: the
  // deployed API sleeps when idle and needs 30-60s to wake, and a shorter
  // limit turns that wait into a "server unreachable" error.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init.headers,
      },
    });

    if (!res.ok) {
      // The API returns { title: "..." } for expected failures.
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.title) message = body.title;
      } catch {
        // response had no JSON body; keep the generic message
      }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'The request timed out. Is the backend running?');
    }
    throw new ApiError(0, 'Could not reach the server. Check WiFi and the API URL.');
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------- types

export interface KpiValue {
  value: number;
  changePercent: number | null;
}

export interface ScraperStatus {
  storeId: number;
  storeName: string;
  status: 'ok' | 'fail' | 'running';
  lastRunAt: string | null;
  itemCount: number;
  canRun: boolean;
}

export interface RankedItem {
  label: string;
  count: number;
}

export interface DashboardResponse {
  lastUpdatedAt: string;
  kpis: {
    totalUsers: KpiValue;
    productsTracked: KpiValue;
    activeAlerts: KpiValue;
    scrapersHealthy: number;
    scrapersTotal: number;
  };
  scrapers: ScraperStatus[];
  topSearches: RankedItem[];
  mostTracked: RankedItem[];
  storeClicks: RankedItem[];
  recentErrors: { storeName: string; message: string; occurredAt: string }[];
}

export interface ApiListing {
  id: number;
  title: string;
  storeName: string;
  price: number;
  currency: string;
  preSelected: boolean;
}

export interface ApiDuplicateGroup {
  id: number;
  title: string;
  matchScore: number;
  /** Set once merged; null while pending. The Split action needs this. */
  productId: number | null;
  listings: ApiListing[];
}

export interface DuplicatesResponse {
  pendingCount: number;
  mergedCount: number;
  items: ApiDuplicateGroup[];
  page: number;
  totalPages: number;
}

export interface DuplicateActionResponse {
  productId: number | null;
  pendingCount: number;
  mergedCount: number;
}

export interface ApiCustomer {
  id: number;
  name: string;
  email: string;
  alertCount: number;
  isActive: boolean;
}

export interface CustomersResponse {
  totalCount: number;
  items: ApiCustomer[];
  page: number;
  totalPages: number;
}

export type Role = 'admin' | 'support' | 'readonly';

export interface ApiTeamMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  avatarInitial: string;
}

export interface TeamResponse {
  totalCount: number;
  items: ApiTeamMember[];
}

export interface ApiTeamRequest {
  id: number;
  email: string;
  name: string | null;
  requestedRole: Role;
  requestedAt: string;
  /** "invite" was sent by an admin; "self_signup" was asked for. They are
   *  revoked and approved respectively — approving an invite 404s, since
   *  no user exists for it until the code is redeemed. */
  type: 'invite' | 'self_signup';
  /** Invites only. */
  expiresAt: string | null;
}

export interface NotificationPrefs {
  newReports: boolean;
  syncFailures: boolean;
  weeklySummaryEmail: boolean;
}

export interface ApiActivityEntry {
  id: number;
  /** Already rendered as a sentence by the server. */
  description: string;
  actorName: string;
  occurredAt: string;
}

export interface ActivityResponse {
  items: ApiActivityEntry[];
  page: number;
  totalPages: number;
}

export type Period = 'weekly' | 'monthly' | 'yearly';

export interface ApiPriceChange {
  product: string;
  fromPrice: number;
  toPrice: number;
  changePercent: number;
}

export interface MoneyRankedItem {
  label: string;
  amount: number;
}

export interface ReportsResponse {
  period: string;
  activeShoppers: KpiValue;
  savedByShoppers: { amount: number; currency: string };
  trendingSearches: RankedItem[];
  priceChanges: ApiPriceChange[];
  storeAverages: MoneyRankedItem[];
  categories: RankedItem[];
}

// -------------------------------------------------------------- calls

export const api = {
  logSearch: (queryText: string) =>
    request<void>('/searches', { method: 'POST', body: JSON.stringify({ queryText }) }),
  logStoreClick: (url: string) =>
    request<void>('/store-clicks', { method: 'POST', body: JSON.stringify({ url }) }),
  dashboard: () => request<DashboardResponse>('/admin/dashboard'),

  rerunScraper: (storeId: number) =>
    request<{ store: string }>(`/admin/scrapers/${storeId}/run`, { method: 'POST' }),

  duplicates: (status: 'pending' | 'merged', search?: string) =>
    request<DuplicatesResponse>(
      `/admin/duplicates?status=${status}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
    ),

  mergeGroup: (groupId: number, listingIds: number[]) =>
    request<DuplicateActionResponse>(`/admin/duplicates/${groupId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ listingIds }),
    }),

  rejectGroup: (groupId: number) =>
    request<DuplicateActionResponse>(`/admin/duplicates/${groupId}/reject`, { method: 'POST' }),

  splitProduct: (productId: number) =>
    request<DuplicateActionResponse>(`/admin/products/${productId}/split`, { method: 'POST' }),

  customers: (search?: string, page = 1, pageSize = 50) =>
    request<CustomersResponse>(
      `/admin/customers?page=${page}&pageSize=${pageSize}` +
        (search ? `&q=${encodeURIComponent(search)}` : ''),
    ),

  team: () => request<TeamResponse>('/admin/team'),

  inviteMember: (email: string, role: Role) =>
    request<{ inviteId: number; email: string; role: string }>('/admin/team/invites', {
      method: 'POST',
      // The API expects the C# enum spelling: Admin / Support / ReadOnly.
      body: JSON.stringify({ email, role: toApiRole(role) }),
    }),

  changeRole: (userId: number, role: Role) =>
    request<ApiTeamMember>(`/admin/team/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: toApiRole(role) }),
    }),

  removeMember: (userId: number) =>
    request<void>(`/admin/team/${userId}`, { method: 'DELETE' }),

  teamRequests: () => request<ApiTeamRequest[]>('/admin/team/requests'),

  approveRequest: (requestId: number) =>
    request<void>(`/admin/team/requests/${requestId}/approve`, { method: 'POST' }),

  rejectRequest: (requestId: number) =>
    request<void>(`/admin/team/requests/${requestId}/reject`, { method: 'POST' }),

  revokeInvite: (requestId: number) =>
    request<void>(`/admin/team/invites/${requestId}`, { method: 'DELETE' }),

  reports: (period: Period) =>
    request<ReportsResponse>(`/admin/reports?period=${period}`),

  activity: (page = 1, pageSize = 30) =>
    request<ActivityResponse>(`/admin/activity?page=${page}&pageSize=${pageSize}`),

  notificationPrefs: () => request<NotificationPrefs>('/admin/me/notifications'),

  updateNotificationPrefs: (prefs: NotificationPrefs) =>
    request<NotificationPrefs>('/admin/me/notifications', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
};

/** The API sends lowercase roles but expects PascalCase when receiving them. */
function toApiRole(role: Role): string {
  return role === 'readonly' ? 'ReadOnly' : role === 'admin' ? 'Admin' : 'Support';
}

/** Full URL for the CSV export, for opening in the browser. */
export function customersExportUrl(): string {
  return `${BASE}/admin/customers/export`;
}

// ------------------------------------------------------------ helpers

/** "2 min ago", "3 hours ago". The API sends ISO timestamps, not display text. */
export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';

  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Turn counts into bar percentages, scaled against the largest value. */
export function toBarRows(items: RankedItem[]) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return items.map((i) => ({
    label: i.label,
    value: i.count.toLocaleString(),
    percent: Math.round((i.count / max) * 100),
  }));
}

/** Same as toBarRows but for money values, which are formatted, not counted. */
export function toMoneyBarRows(items: MoneyRankedItem[]) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  return items.map((i) => ({
    label: i.label,
    value: formatPrice(i.amount),
    percent: Math.round((i.amount / max) * 100),
  }));
}

/** Share of total, as whole percents — for the category breakdown. */
export function toShareBarRows(items: RankedItem[]) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  const max = Math.max(...items.map((i) => i.count), 1);
  return items.map((i) => ({
    label: i.label,
    value: `${Math.round((i.count / total) * 100)}%`,
    percent: Math.round((i.count / max) * 100),
  }));
}

export function formatPrice(amount: number, currency = 'PKR') {
  const symbol = currency === 'PKR' ? 'Rs' : currency;
  return `${symbol} ${amount.toLocaleString()}`;
}