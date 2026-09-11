import axios from 'axios';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://pricely-production-15a0.up.railway.app'
).replace(/\/$/, '');

const AUTH_BASE = `${API_BASE_URL}/api/auth`;
const ADMIN_BASE = `${API_BASE_URL}/api/v1`;

// ---------------------------------------------------------------- auth token

let _authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  _authToken = token;
}

// ---------------------------------------------------------------- core request

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
        ...init.headers,
      },
    });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.title) message = body.title;
        else if (body?.message) message = body.message;
      } catch { /* no JSON body */ }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'The request timed out.');
    }
    throw new ApiError(0, 'Could not reach the server.');
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------- auth types

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'readonly' | 'user';
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface PendingApprovalResponse {
  status: 'pending_approval';
}

// ---------------------------------------------------------------- admin types

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
  type: 'invite' | 'self_signup';
  expiresAt: string | null;
}

export interface NotificationPrefs {
  newReports: boolean;
  syncFailures: boolean;
  weeklySummaryEmail: boolean;
}

export interface ApiActivityEntry {
  id: number;
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

// ---------------------------------------------------------------- admin API

function toApiRole(role: Role): string {
  return role === 'readonly' ? 'ReadOnly' : role === 'admin' ? 'Admin' : 'Support';
}

export const adminApi = {
  dashboard: () =>
    request<DashboardResponse>(`${ADMIN_BASE}/admin/dashboard`),

  rerunScraper: (storeId: number) =>
    request<{ store: string }>(`${ADMIN_BASE}/admin/scrapers/${storeId}/run`, { method: 'POST' }),

  duplicates: (status: 'pending' | 'merged', search?: string) =>
    request<DuplicatesResponse>(
      `${ADMIN_BASE}/admin/duplicates?status=${status}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
    ),

  mergeGroup: (groupId: number, listingIds: number[]) =>
    request<DuplicateActionResponse>(`${ADMIN_BASE}/admin/duplicates/${groupId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ listingIds }),
    }),

  rejectGroup: (groupId: number) =>
    request<DuplicateActionResponse>(`${ADMIN_BASE}/admin/duplicates/${groupId}/reject`, { method: 'POST' }),

  splitProduct: (productId: number) =>
    request<DuplicateActionResponse>(`${ADMIN_BASE}/admin/products/${productId}/split`, { method: 'POST' }),

  customers: (search?: string, page = 1, pageSize = 50) =>
    request<CustomersResponse>(
      `${ADMIN_BASE}/admin/customers?page=${page}&pageSize=${pageSize}` +
        (search ? `&q=${encodeURIComponent(search)}` : ''),
    ),

  team: () => request<TeamResponse>(`${ADMIN_BASE}/admin/team`),

  inviteMember: (email: string, role: Role) =>
    request<{ inviteId: number; email: string; role: string }>(`${ADMIN_BASE}/admin/team/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role: toApiRole(role) }),
    }),

  changeRole: (userId: number, role: Role) =>
    request<ApiTeamMember>(`${ADMIN_BASE}/admin/team/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: toApiRole(role) }),
    }),

  removeMember: (userId: number) =>
    request<void>(`${ADMIN_BASE}/admin/team/${userId}`, { method: 'DELETE' }),

  teamRequests: () => request<ApiTeamRequest[]>(`${ADMIN_BASE}/admin/team/requests`),

  approveRequest: (requestId: number) =>
    request<void>(`${ADMIN_BASE}/admin/team/requests/${requestId}/approve`, { method: 'POST' }),

  rejectRequest: (requestId: number) =>
    request<void>(`${ADMIN_BASE}/admin/team/requests/${requestId}/reject`, { method: 'POST' }),

  revokeInvite: (requestId: number) =>
    request<void>(`${ADMIN_BASE}/admin/team/invites/${requestId}`, { method: 'DELETE' }),

  reports: (period: Period) =>
    request<ReportsResponse>(`${ADMIN_BASE}/admin/reports?period=${period}`),

  activity: (page = 1, pageSize = 30) =>
    request<ActivityResponse>(`${ADMIN_BASE}/admin/activity?page=${page}&pageSize=${pageSize}`),

  notificationPrefs: () => request<NotificationPrefs>(`${ADMIN_BASE}/admin/me/notifications`),

  updateNotificationPrefs: (prefs: NotificationPrefs) =>
    request<NotificationPrefs>(`${ADMIN_BASE}/admin/me/notifications`, {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),

  customersExportUrl: () => `${ADMIN_BASE}/admin/customers/export`,
};

// ---------------------------------------------------------------- auth API

export const authApi = {
  login: (email: string, password: string, deviceName: string) =>
    request<AuthResponse>(`${AUTH_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceName }),
    }),

  signup: (name: string, email: string, password: string, role: string) =>
    request<AuthResponse | PendingApprovalResponse>(`${AUTH_BASE}/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),

  verifySignup: (email: string, code: string) =>
    request<AuthResponse | PendingApprovalResponse>(`${AUTH_BASE}/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ email, code, deviceName: 'Web Browser' }),
    }),

  forgotPassword: (email: string) =>
    request<void>(`${AUTH_BASE}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyResetCode: (email: string, code: string) =>
    request<void>(`${AUTH_BASE}/verify-reset-code`, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<void>(`${AUTH_BASE}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  resendCode: (email: string, purpose: 'Signup' | 'PasswordReset') =>
    request<void>(`${AUTH_BASE}/resend-code`, {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    }),

  logout: () => request<void>(`${AUTH_BASE}/logout`, { method: 'POST' }),
};

export function isAuthResponse(res: AuthResponse | PendingApprovalResponse): res is AuthResponse {
  return 'accessToken' in res;
}

// ---------------------------------------------------------------- helpers

/** "2 min ago", "3 hours ago" */
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

export function toMoneyBarRows(items: MoneyRankedItem[]) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  return items.map((i) => ({
    label: i.label,
    value: formatAdminPrice(i.amount),
    percent: Math.round((i.amount / max) * 100),
  }));
}

export function toShareBarRows(items: RankedItem[]) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  const max = Math.max(...items.map((i) => i.count), 1);
  return items.map((i) => ({
    label: i.label,
    value: `${Math.round((i.count / total) * 100)}%`,
    percent: Math.round((i.count / max) * 100),
  }));
}

export function formatAdminPrice(amount: number, currency = 'PKR') {
  const symbol = currency === 'PKR' ? 'Rs' : currency;
  return `${symbol} ${amount.toLocaleString()}`;
}

export interface ApiProduct {
  id?: number;
  title: string;
  store: string;
  price: string;
  currency: string;
  handle: string;
  url: string;
  imageUrl: string;
  hasComparison?: boolean;
  hasPriceDrop?: boolean;
}

export interface SearchResponse {
  source: string;
  results: ApiProduct[];
}

export interface BrowseResponse {
  source: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  results: ApiProduct[];
}

export interface GroupOffer {
  store: string;
  price: number;
  url: string;
}

export interface ProductGroup {
  groupId: number;
  title: string;
  image: string;
  category: string;
  lowestPrice: number;
  storeCount: number;
  offers: GroupOffer[];
}

export interface ProductGroupsResponse {
  count: number;
  groups: ProductGroup[];
}

export interface CompareOffer {
  store: string;
  price: number;
  url?: string;
}

export interface CompareResponse {
  hasComparison: boolean;
  lowestPrice: number;
  offers: CompareOffer[];
}

export interface PriceHistoryPoint {
  price: number;
  date: string;
}

export interface PriceHistoryResponse {
  hasHistory: boolean;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  pointCount: number;
  points: PriceHistoryPoint[];
}

export interface ProductVariant {
  title: string;
  price: string;
  available: boolean;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface ProductDetail {
  title: string;
  store: string;
  description: string;
  brand: string;
  images: string[];
  variants?: ProductVariant[];
  specs?: SpecItem[];
  url: string;
  viewOnStoreUrl?: string;
  note?: string;
}

/** Format price string or number into clean Pakistani Rupees (e.g. 71500 -> "Rs 71,500") */
export function formatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null || price === '') return 'Rs 0';
  const strVal = String(price).trim();
  if (strVal.toLowerCase().startsWith('rs')) return strVal;

  const num = typeof price === 'number' ? price : parseFloat(strVal.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return strVal;

  return `Rs ${Math.round(num).toLocaleString('en-PK')}`;
}

/** Calculate percentage savings between lowest price and higher price */
export function calculateSavings(lowest: number, higher: number): number {
  if (!higher || higher <= lowest) return 0;
  return Math.round(((higher - lowest) / higher) * 100);
}

/** Fetch Browse products (GET /api/browse) */
export async function fetchBrowseProducts(
  category: string,
  store?: string,
  seed?: number,
  page: number = 1,
  pageSize: number = 60
): Promise<BrowseResponse> {
  try {
    const params: Record<string, string | number> = { category, page, pageSize };
    if (store && store !== 'All') params.store = store;
    if (seed !== undefined && seed !== 0) params.seed = seed;

    const res = await axios.get<BrowseResponse>(`${API_BASE_URL}/api/browse`, { params, timeout: 15000 });
    return res.data;
  } catch (err: unknown) {
    console.warn('[API] Browse failed:', (err as Error)?.message);
    return { source: 'database', page, pageSize, total: 0, totalPages: 0, hasMore: false, results: [] };
  }
}

/** Fetch Search products (GET /api/search) */
export async function fetchSearchProducts(query: string, store?: string): Promise<ApiProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const params: Record<string, string> = { q: trimmed };
    if (store && store !== 'All') params.store = store;

    const res = await axios.get<SearchResponse>(`${API_BASE_URL}/api/search`, { params, timeout: 15000 });
    return res.data?.results || [];
  } catch (err: unknown) {
    console.warn('[API] Search failed:', (err as Error)?.message);
    return [];
  }
}

/** Fetch Product Groups / Best Comparisons (GET /api/product-groups) */
export async function fetchProductGroups(category?: string): Promise<ProductGroup[]> {
  try {
    const params: Record<string, string> = {};
    if (category && category !== 'all') params.category = category;

    const res = await axios.get<ProductGroupsResponse>(`${API_BASE_URL}/api/product-groups`, { params, timeout: 15000 });
    return res.data?.groups || [];
  } catch (err: unknown) {
    console.warn('[API] Product groups failed:', (err as Error)?.message);
    return [];
  }
}

/** Fetch Compare prices for listing or title (GET /api/compare) */
export async function fetchCompare(listingId?: number, title?: string): Promise<CompareResponse | null> {
  try {
    const params: Record<string, string | number> = {};
    if (listingId && listingId > 0) params.listingId = listingId;
    if (title && title.trim()) params.title = title.trim();

    if (!params.listingId && !params.title) return null;

    const res = await axios.get<CompareResponse>(`${API_BASE_URL}/api/compare`, { params, timeout: 15000 });
    return res.data || null;
  } catch (err: unknown) {
    console.warn('[API] Compare failed:', (err as Error)?.message);
    return null;
  }
}

/** Fetch Price History for listing (GET /api/price-history) */
export async function fetchPriceHistory(listingId: number, days: number = 30): Promise<PriceHistoryResponse | null> {
  if (!listingId || listingId <= 0) return null;

  try {
    const res = await axios.get<PriceHistoryResponse>(`${API_BASE_URL}/api/price-history`, {
      params: { listingId, days },
      timeout: 10000,
    });
    return res.data || null;
  } catch (err: unknown) {
    console.warn('[API] Price history failed:', (err as Error)?.message);
    return null;
  }
}

/** Fetch Product Detail (Telemart / Mega.pk / Daraz endpoint dispatch) */
export async function fetchProductDetail(
  handleOrId: string | number,
  store?: string,
  productUrl?: string
): Promise<ProductDetail | null> {
  try {
    const storeClean = (store || '').toLowerCase();

    if (storeClean === 'mega.pk' && productUrl) {
      const res = await axios.get<Record<string, unknown>>(`${API_BASE_URL}/api/megapk-product`, {
        params: { url: productUrl },
        timeout: 15000,
      });
      const data = res.data;
      if (!data) return null;
      return {
        title: (data.title as string) || 'Mega.pk Product',
        store: 'Mega.pk',
        description: '',
        brand: (data.brand as string) || 'Mega.pk',
        images: Array.isArray(data.images) ? (data.images as string[]).filter(Boolean) : [],
        specs: Array.isArray(data.specs) ? (data.specs as SpecItem[]) : [],
        url: (data.url as string) || productUrl,
      };
    }

    if (storeClean === 'daraz' && productUrl) {
      const res = await axios.get<Record<string, unknown>>(`${API_BASE_URL}/api/daraz-product`, {
        params: { url: productUrl },
        timeout: 15000,
      });
      const data = res.data;
      if (!data) return null;
      return {
        title: (data.title as string) || 'Daraz Product',
        store: 'Daraz',
        description: (data.note as string) || 'View full details and customer reviews on Daraz',
        brand: (data.brand as string) || 'Daraz',
        images: Array.isArray(data.images) ? (data.images as string[]).filter(Boolean) : [],
        url: (data.viewOnStoreUrl as string) || productUrl,
        viewOnStoreUrl: (data.viewOnStoreUrl as string) || productUrl,
        note: data.note as string,
      };
    }

    // Default to Telemart JSON endpoint by handle/slug
    const safeHandle = String(handleOrId).replace(/^\/+|\/+$/g, '');
    const res = await axios.get<Record<string, unknown>>(`${API_BASE_URL}/api/product/${encodeURIComponent(safeHandle)}`, { timeout: 15000 });
    const data = res.data;
    if (!data) return null;

    const rawImages = data.images || data.Images;
    const rawVariants = data.variants || data.Variants;

    return {
      title: (data.title || data.Title || '') as string,
      store: (data.store || data.Store || 'Telemart') as string,
      description: (data.description || data.Description || '') as string,
      brand: (data.brand || data.Brand || '') as string,
      images: Array.isArray(rawImages) ? (rawImages as string[]).filter(Boolean) : [],
      variants: Array.isArray(rawVariants) ? (rawVariants as ProductVariant[]) : [],
      url: (data.url || data.Url || `https://www.telemart.pk/products/${safeHandle}`) as string,
    };
  } catch (err: unknown) {
    console.warn('[API] Product detail fetch failed:', (err as Error)?.message);
    return null;
  }
}

/** Fetch Trending Searches from public stats endpoint */
export async function fetchTrendingSearches(limit = 8): Promise<{ label: string; count: number }[]> {
  try {
    const res = await axios.get<{ topSearches?: { label: string; count: number }[]; trendingSearches?: { label: string; count: number }[] }>(
      `${API_BASE_URL}/api/v1/admin/dashboard`,
      { timeout: 10000 }
    );
    const searches = res.data?.topSearches || res.data?.trendingSearches || [];
    return searches.slice(0, limit);
  } catch {
    // Fallback to static trending terms if API requires auth
    return [
      { label: 'iPhone 15', count: 320 },
      { label: 'Samsung Galaxy', count: 280 },
      { label: 'Laptop HP', count: 215 },
      { label: 'Redmi Note', count: 198 },
      { label: 'Smart TV 43 inch', count: 175 },
      { label: 'AirPods', count: 154 },
      { label: 'PlayStation 5', count: 143 },
      { label: 'Canon Camera', count: 128 },
    ];
  }
}

/** Fetch best price-drop products for a specific category */
export async function fetchCategoryBestDrops(
  category: string,
  page: number = 1,
  pageSize: number = 12
): Promise<BrowseResponse> {
  return fetchBrowseProducts(category, undefined, undefined, page, pageSize);
}

const ROUND_ROBIN_CATEGORIES = [
  'mobiles_tablets',
  'laptops_computers',
  'tv_entertainment',
  'home_appliances',
  'kitchen_appliances',
  'cameras',
  'audio',
  'wearables',
  'gaming',
  'accessories',
];

/** Fetch products across all categories in round-robin interleaved order */
export async function fetchRoundRobinDrops(
  page: number = 1,
  pageSize: number = 20,
  seed?: number
): Promise<{ results: ApiProduct[]; hasMore: boolean }> {
  try {
    const currentSeed = seed ?? Math.floor(Math.random() * 1000000);
    const perCat = Math.max(2, Math.ceil(pageSize / ROUND_ROBIN_CATEGORIES.length));
    const promises = ROUND_ROBIN_CATEGORIES.map((cat) =>
      fetchBrowseProducts(cat, undefined, currentSeed, page, perCat)
    );

    const responses = await Promise.allSettled(promises);
    const catLists: ApiProduct[][] = responses.map((res) =>
      res.status === 'fulfilled' ? res.value.results || [] : []
    );

    const interleaved: ApiProduct[] = [];
    let maxLen = 0;
    for (const list of catLists) {
      if (list.length > maxLen) maxLen = list.length;
    }

    for (let i = 0; i < maxLen; i++) {
      for (let c = 0; c < catLists.length; c++) {
        if (catLists[c][i]) {
          interleaved.push(catLists[c][i]);
        }
      }
    }

    const hasMore = responses.some(
      (res) => res.status === 'fulfilled' && res.value.hasMore
    );

    return { results: interleaved, hasMore };
  } catch {
    return { results: [], hasMore: false };
  }
}

