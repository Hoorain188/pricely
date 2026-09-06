// Central API configuration & services for Pricely mobile app.
// Connects React Native frontend screens to ASP.NET Core backend API.

import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Re-export so existing imports from this file keep working.
export { API_BASE_URL };

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

export interface ProductVariant {
  title: string;
  price: string;
  available: boolean;
}

export interface ProductDetail {
  title: string;
  store: string;
  description: string;
  brand: string;
  images: string[];
  variants: ProductVariant[];
  url: string;
}

/**
 * Format price string or number into clean Pakistani Rupees string (e.g. "71500.00" -> "Rs 71,500")
 */
export function formatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null || price === '') return 'Rs 0';
  const strVal = String(price).trim();
  if (strVal.toLowerCase().startsWith('rs')) return strVal;

  const num = typeof price === 'number' ? price : parseFloat(strVal.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return strVal;

  return `Rs ${Math.round(num).toLocaleString('en-PK')}`;
}

/**
 * Strip HTML tags into clean, human-readable plain text paragraphs
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Format and convert product description into clear, professional English
 */
export function formatEnglishDescription(rawText: string | undefined | null, title?: string, storeName?: string): string {
  const text = stripHtml(rawText);
  const store = storeName || 'Daraz';
  const name = title || 'This product';

  if (!text || text.length < 10) {
    return `📌 Product Overview:\n${name} is available on ${store}.pk with authentic brand warranty, verified seller ratings, and competitive pricing across top e-commerce stores in Pakistan.\n\n⚙️ Specifications & Key Details:\n• Verified authentic stock with nationwide delivery across Pakistan.\n• Live price comparison and historical drop alerts enabled on Pricely.pk.`;
  }

  // Comprehensive Roman Urdu to Professional English dictionary & regex replacement
  let translated = text
    .replace(/tafzeel|tafseel|tafsil/gi, 'Detailed Specifications & Features')
    .replace(/khasoosiyat|khasosiyat/gi, 'Key Specifications & Highlights')
    .replace(/wazahat/gi, 'Detailed Overview')
    .replace(/samne wala camera|samne camera|front camera/gi, 'Front Selfie Camera')
    .replace(/piche wala camera|peeche camera|back camera/gi, 'Rear Primary Camera')
    .replace(/dabba saath|dabba sath|box saath/gi, 'includes original retail packaging')
    .replace(/dabba/gi, 'original box')
    .replace(/boht achi quality|bohat achi quality|bht achi quality/gi, 'premium build quality')
    .replace(/boht achi|bohat achi|bht achi|boht acha|bohat acha/gi, 'excellent high quality')
    .replace(/asli product|asli cheez|asli/gi, '100% authentic original product')
    .replace(/sasta tareen price|sasta tareen daam|sasta tareen/gi, 'lowest competitive market price')
    .replace(/munasib daam|munasib keemat|munasib price/gi, 'affordable budget-friendly price')
    .replace(/khareedain|kharidain|khareeden/gi, 'buy online')
    .replace(/chalega|chalegi|chalta hai/gi, 'delivers smooth performance')
    .replace(/1 saal ki|ek saal ki|1 saal/gi, '1-Year official')
    .replace(/2 saal ki|do saal ki|2 saal/gi, '2-Year official')
    .replace(/warranty hai|warranty milay gi|warranty milegi/gi, 'brand warranty included')
    .replace(/warranty nahi/gi, 'no seller warranty')
    .replace(/poore pakistan main|pure pakistan main|poore pakistan mein/gi, 'nationwide across Pakistan')
    .replace(/delivery charges|delivery ke paise/gi, 'Shipping fee')
    .replace(/tasveer|tasaveer/gi, 'product photo gallery')
    .replace(/sab se behtareen|behtareen/gi, 'top tier best in class')
    .replace(/baad main|baad mein|bad main|bad mein/gi, 'subsequently')
    .replace(/pehle/gi, 'previously')
    .replace(/naya/gi, 'brand new')
    .replace(/rang/gi, 'color variant')
    .replace(/samne/gi, 'front')
    .replace(/peeche|piche/gi, 'rear')
    .replace(/shukriya/gi, 'Thank you for shopping with us.')
    .replace(/sab se pehle/gi, 'First of all,')
    .replace(/aap ko|ap ko/gi, 'you')
    .replace(/daraaz|daraz.pk/gi, 'Daraz.pk');

  if (!translated.includes('📌') && !translated.includes('•')) {
    return `📌 Product Description:\n${translated}\n\n⚙️ Specifications & Guarantee:\n• Official ${store} product listing with verified authentic seller details.\n• Eligible for price drop alerts & live comparison across top Pakistan stores.`;
  }

  return translated;
}

/**
 * Search products from backend API (GET /api/search?q={query})
 */
export async function fetchSearchProducts(query: string, store?: string): Promise<ApiProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const params: Record<string, string> = { q: trimmed };
    if (store) params.store = store;

    const response = await axios.get<SearchResponse>(`${API_BASE_URL}/api/search`, {
      params,
      timeout: 15000,
    });

    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error: any) {
    console.warn(`[API] Search failed for query "${trimmed}":`, error?.message || error);
    throw new Error("Can't reach server — check connection");
  }
}

/**
 * Browse products by category from backend API (GET /api/browse?category={cat}&store={store}&seed={seed}&page={page}&pageSize={pageSize})
 * Returns paginated products with hasComparison flag.
 */
export async function fetchBrowseProducts(
  category: string,
  store?: string,
  seed?: number,
  page?: number,
  pageSize?: number
): Promise<BrowseResponse> {
  const trimmed = category.trim();
  if (!trimmed) return { source: 'database', page: 1, pageSize: 60, total: 0, totalPages: 0, hasMore: false, results: [] };

  try {
    const params: Record<string, string> = { category: trimmed };
    if (store) params.store = store;
    if (seed !== undefined && seed !== 0) params.seed = String(seed);
    if (page !== undefined && page > 0) params.page = String(page);
    if (pageSize !== undefined && pageSize > 0) params.pageSize = String(pageSize);

    const response = await axios.get<BrowseResponse>(`${API_BASE_URL}/api/browse`, {
      params,
      timeout: 15000,
    });

    if (response.data && Array.isArray(response.data.results)) {
      return response.data;
    }
    return { source: 'database', page: page || 1, pageSize: pageSize || 60, total: 0, totalPages: 0, hasMore: false, results: [] };
  } catch (error: any) {
    console.warn(`[API] Browse failed for category "${trimmed}":`, error?.message || error);
    throw new Error("Can't reach server — check connection");
  }
}

/**
 * Get product detail from backend API by handle (GET /api/product/{handle})
 */
export async function fetchProductDetail(handle: string): Promise<ProductDetail | null> {
  const trimmed = handle.trim();
  if (!trimmed) return null;

  try {
    const response = await axios.get<ProductDetail>(`${API_BASE_URL}/api/product/${encodeURIComponent(trimmed)}`, {
      timeout: 15000,
    });
    return response.data || null;
  } catch (error: any) {
    return {
      title: trimmed.replace(/-/g, ' '),
      store: 'Telemart',
      description: 'Product details loaded. Check live store for latest stock.',
      brand: 'Telemart',
      images: [],
      variants: [{ title: 'Standard', price: '0', available: true }],
      url: `https://telemart.pk/${trimmed}`,
    };
  }
}

/**
 * Get Mega.pk product detail from backend API by URL (GET /api/megapk-product?url={url})
 */
export async function fetchMegaPkProductDetail(productUrl: string): Promise<ProductDetail | null> {
  const trimmed = productUrl.trim();
  if (!trimmed) return null;

  try {
    const response = await axios.get<any>(`${API_BASE_URL}/api/megapk-product`, {
      params: { url: trimmed },
      timeout: 15000,
    });
    const data = response.data;
    if (!data) return null;

    return {
      title: data.title || '',
      store: 'Mega.pk',
      description: data.specs && Array.isArray(data.specs)
        ? data.specs.map((s: any) => `${s.label}: ${s.value}`).join('\n')
        : '',
      brand: data.brand || '',
      images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
      variants: [{ title: 'Standard', price: data.price || '0', available: true }],
      url: data.url || trimmed,
    };
  } catch (error: any) {
    return {
      title: 'Mega.pk Product',
      store: 'Mega.pk',
      description: 'View full details and live stock directly on Mega.pk',
      brand: 'Mega.pk',
      images: [],
      variants: [{ title: 'Standard', price: '0', available: true }],
      url: trimmed.startsWith('http') ? trimmed : `https://www.mega.pk/${trimmed}`,
    };
  }
}

/**
 * Get Daraz product detail from backend API by URL (GET /api/daraz-product?url={url})
 */
export async function fetchDarazProductDetail(productUrl: string): Promise<ProductDetail | null> {
  const trimmed = productUrl.trim();
  if (!trimmed) return null;

  try {
    const response = await axios.get<any>(`${API_BASE_URL}/api/daraz-product`, {
      params: { url: trimmed },
      timeout: 15000,
    });
    const data = response.data;
    if (!data) return null;

    return {
      title: data.title || '',
      store: 'Daraz',
      description: data.note || 'View full details and customer reviews on Daraz.pk',
      brand: data.brand || '',
      images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
      variants: [{ title: 'Standard', price: data.price || '0', available: true }],
      url: data.viewOnStoreUrl || trimmed,
    };
  } catch (error: any) {
    return {
      title: 'Daraz Product',
      store: 'Daraz',
      description: 'View full details and customer reviews on Daraz.pk',
      brand: 'Daraz',
      images: [],
      variants: [{ title: 'Standard', price: '0', available: true }],
      url: trimmed.startsWith('http') ? trimmed : `https://www.daraz.pk/${trimmed}`,
    };
  }
}

/**
 * Fetch categories for a specific store (GET /api/store-categories?store={store})
 */
export async function fetchStoreCategories(store: string): Promise<{ category: string; count: number }[]> {
  const trimmed = store.trim();
  if (!trimmed) return [];

  try {
    const response = await axios.get<{ category: string; count: number }[]>(`${API_BASE_URL}/api/store-categories`, {
      params: { store: trimmed },
      timeout: 15000,
    });
    return response.data || [];
  } catch (error: any) {
    console.warn(`[API] Fetch store categories failed for "${trimmed}":`, error?.message || error);
    return [];
  }
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

/**
 * Fetch live price comparison across stores for a product (GET /api/compare?listingId={id}&title={title})
 */
export async function fetchCompare(listingId?: number, title?: string): Promise<CompareResponse | null> {
  try {
    const params: Record<string, any> = {};
    if (listingId && !isNaN(listingId) && listingId > 0) {
      params.listingId = listingId;
    }
    if (title && title.trim() && title !== 'Product Detail') {
      params.title = title.trim();
    }

    if (!params.listingId && !params.title) return null;

    const requestUrl = `${API_BASE_URL}/api/compare`;
    console.log('[fetchCompare] Requesting URL:', requestUrl, 'params:', params);

    const response = await axios.get<CompareResponse>(requestUrl, {
      params,
      timeout: 10000,
    });

    console.log('[fetchCompare] Response data:', response.data);
    return response.data || null;
  } catch (error: any) {
    console.warn(`[API] Fetch compare failed:`, error?.message || error);
    return null;
  }
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

/**
 * Fetch price history for a listing (GET /api/price-history?listingId={id}&days={days})
 */
export async function fetchPriceHistory(listingId: number, days: number = 30): Promise<PriceHistoryResponse | null> {
  if (!listingId || isNaN(listingId) || listingId <= 0) return null;

  try {
    const response = await axios.get<PriceHistoryResponse>(`${API_BASE_URL}/api/price-history`, {
      params: { listingId, days },
      timeout: 10000,
    });
    return response.data || null;
  } catch (error: any) {
    console.warn(`[API] Fetch price history failed for listing ${listingId}:`, error?.message || error);
    return null;
  }
}
