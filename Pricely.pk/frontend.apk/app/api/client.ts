/**
 * One place for the API base URL and every admin call.
 *
 * Set EXPO_PUBLIC_API_URL in .env at the project root:
 *   EXPO_PUBLIC_API_URL=http://192.168.10.8:5059/api/v1
 *
 * It must be the laptop's LAN IP, not localhost — on a phone "localhost"
 * means the phone itself. Re-check it whenever you change WiFi.
 */

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

/** Stands in for the signed-in admin until auth ships. Remove once JWTs exist. */
let actorId: string | null = '208';

export function setActorId(id: string | null) {
  actorId = id;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) {
    throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not set. Add it to .env and restart Expo.');
  }

  // Give up rather than hang forever on a dead network.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(actorId ? { 'X-Actor-Id': actorId } : {}),
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
}

export interface NotificationPrefs {
  newReports: boolean;
  syncFailures: boolean;
  weeklySummaryEmail: boolean;
}

// -------------------------------------------------------------- calls

export const api = {
  dashboard: () => request<DashboardResponse>('/admin/dashboard'),

  rerunScraper: (storeId: number) =>
    request<{ jobId: string }>(`/admin/scrapers/${storeId}/run`, { method: 'POST' }),

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

export function formatPrice(amount: number, currency = 'PKR') {
  const symbol = currency === 'PKR' ? 'Rs' : currency;
  return `${symbol} ${amount.toLocaleString()}`;
}