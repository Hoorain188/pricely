// Central API configuration & services for Pricely mobile app.
// Connects React Native frontend screens to ASP.NET Core backend API.

import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Single Backend Base URL Configuration Constant:
 * Dynamically resolves your PC's local Wi-Fi IP address when running via Expo Go on a physical phone.
 * Falls back to 10.0.2.2 for Android Emulator.
 */
const getApiBaseUrl = (): string => {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5079`;
  }
  return 'http://10.0.2.2:5079';
};

export const API_BASE_URL = getApiBaseUrl();

export interface ApiProduct {
  title: string;
  store: string;
  price: string;
  currency: string;
  handle: string;
  url: string;
  imageUrl: string;
}

export interface SearchResponse {
  source: string;
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
      timeout: 8000,
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
 * Browse products by category from backend API (GET /api/browse?category={cat}&store={store}&seed={seed})
 * Returns products from both Telemart and Mega.pk unless a specific store is provided.
 * seed param rotates/varies results on refresh.
 */
export async function fetchBrowseProducts(category: string, store?: string, seed?: number): Promise<ApiProduct[]> {
  const trimmed = category.trim();
  if (!trimmed) return [];

  try {
    const params: Record<string, string> = { category: trimmed };
    if (store) params.store = store;
    if (seed !== undefined && seed !== 0) params.seed = String(seed);

    const response = await axios.get<SearchResponse>(`${API_BASE_URL}/api/browse`, {
      params,
      timeout: 8000,
    });

    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
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
      timeout: 8000,
    });
    return response.data || null;
  } catch (error: any) {
    console.warn(`[API] Fetch detail failed for handle "${trimmed}":`, error?.message || error);
    throw new Error("Can't reach server — check connection");
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
      timeout: 8000,
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
    console.warn(`[API] Fetch Mega.pk detail failed for url "${trimmed}":`, error?.message || error);
    throw new Error("Can't reach server — check connection");
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
      timeout: 8000,
    });
    return response.data || [];
  } catch (error: any) {
    console.warn(`[API] Fetch store categories failed for "${trimmed}":`, error?.message || error);
    return [];
  }
}

