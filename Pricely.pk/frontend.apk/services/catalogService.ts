import { fetchSearchProducts, fetchStoreCategories, formatPrice } from './api';

export interface Category {
  key: string;
  label: string;
}

export interface Deal {
  id: string;
  idNum?: number;
  name: string;
  price: string;
  discount: string;
  store: string;
  imageSeed: string;
  handle?: string;
  imageUrl?: string;
  url?: string;
}

export interface SubcategoryProduct {
  id?: number;
  name: string;
  price: string;
  pictureTag?: string;
  handle?: string;
  imageUrl?: string;
  url?: string;
  store?: string;
  currency?: string;
  hasComparison?: boolean;
  hasPriceDrop?: boolean;
}

export interface Subcategory {
  key: string;
  label: string;
  imageTag: string;
  products: SubcategoryProduct[];
}

// ---------------------------------------------------------------------------
//  10 FIXED TECH CATEGORIES — dono stores (Telemart + Mega.pk) same slugs
// ---------------------------------------------------------------------------
export const CATEGORIES: Category[] = [
  { key: 'mobiles_tablets',     label: 'Mobiles & Tablets' },
  { key: 'laptops_computers',  label: 'Laptops & Computers' },
  { key: 'tv_entertainment',   label: 'TVs & Entertainment' },
  { key: 'home_appliances',    label: 'Home Appliances' },
  { key: 'kitchen_appliances', label: 'Kitchen Appliances' },
  { key: 'cameras',            label: 'Cameras' },
  { key: 'audio',              label: 'Audio' },
  { key: 'wearables',          label: 'Wearables' },
  { key: 'gaming',             label: 'Gaming' },
  { key: 'accessories',        label: 'Accessories' },
];

export const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  'Mobiles & Tablets': 'mobiles_tablets',
  'Mobiles': 'mobiles_tablets',
  'Laptops & Computers': 'laptops_computers',
  'TVs & Entertainment': 'tv_entertainment',
  'TV & Entertainment': 'tv_entertainment',
  'Home Appliances': 'home_appliances',
  'Kitchen Appliances': 'kitchen_appliances',
  'Cameras': 'cameras',
  'Audio': 'audio',
  'Wearables': 'wearables',
  'Gaming': 'gaming',
  'Accessories': 'accessories',
};

export function getCategoryKeyFromLabel(label: string): string {
  if (CATEGORY_LABEL_TO_KEY[label]) return CATEGORY_LABEL_TO_KEY[label];
  const lower = (label || '').toLowerCase();
  if (lower.includes('mobile') || lower.includes('phone') || lower.includes('tablet')) return 'mobiles_tablets';
  if (lower.includes('laptop') || lower.includes('computer')) return 'laptops_computers';
  if (lower.includes('tv') || lower.includes('entertainment')) return 'tv_entertainment';
  if (lower.includes('kitchen')) return 'kitchen_appliances';
  if (lower.includes('home') || lower.includes('appliance')) return 'home_appliances';
  if (lower.includes('camera')) return 'cameras';
  if (lower.includes('audio') || lower.includes('sound')) return 'audio';
  if (lower.includes('wear') || lower.includes('watch')) return 'wearables';
  if (lower.includes('game') || lower.includes('gaming')) return 'gaming';
  if (lower.includes('access')) return 'accessories';
  return 'mobiles_tablets';
}

export const STORE_BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  daraz: { bg: '#FFF0E6', color: '#F57224', border: 'rgba(245,114,36,0.35)' },
  telemart: { bg: '#EAF4EF', color: '#1D9A7C', border: 'rgba(29,154,124,0.35)' },
  'mega.pk': { bg: '#E7EEFC', color: '#2F6FB0', border: 'rgba(47,111,176,0.35)' },
  megapk: { bg: '#E7EEFC', color: '#2F6FB0', border: 'rgba(47,111,176,0.35)' },
  amazon: { bg: '#FEF3C7', color: '#B45309', border: 'rgba(180,83,9,0.35)' },
  default: { bg: '#F1F5F9', color: '#475569', border: 'rgba(71,85,105,0.35)' },
};

export function getStoreBadgeStyle(storeName?: string) {
  const key = (storeName || '').toLowerCase().trim();
  if (key.includes('daraz')) return STORE_BADGE_STYLES.daraz;
  if (key.includes('telemart')) return STORE_BADGE_STYLES.telemart;
  if (key.includes('mega')) return STORE_BADGE_STYLES['mega.pk'];
  if (key.includes('amazon')) return STORE_BADGE_STYLES.amazon;
  return STORE_BADGE_STYLES.default;
}

const MOCK_TRENDING = ['Redmi Note 13', 'Air Fryer 5L', 'PS5 slim', 'iPhone 15', 'Smart Watch', 'MacBook Air'];

const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Redmi Note 13 8/256', price: 'Rs 54,999', discount: '12%', store: 'Telemart', imageSeed: 'redmi-note-13' },
  { id: '2', name: 'Anker 20000mAh PB', price: 'Rs 8,450', discount: '20%', store: 'Mega.pk', imageSeed: 'anker-powerbank' },
  { id: '3', name: 'Samsung 55" 4K TV', price: 'Rs 124,999', discount: '15%', store: 'Mega.pk', imageSeed: 'samsung-tv' },
  { id: '4', name: 'Xiaomi Air Fryer 5L', price: 'Rs 11,999', discount: '10%', store: 'Mega.pk', imageSeed: 'air-fryer' },
  { id: '5', name: 'MacBook Air M2', price: 'Rs 289,999', discount: '8%', store: 'Telemart', imageSeed: 'macbook-air' },
];

export const dealImageUri = (seed: string) => `https://picsum.photos/seed/${seed}/300/300`;

const fakeLatency = <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 100));

// ---------------------------------------------------------------------------
//  CATEGORIES — same 10 categories for everyone. Store diya ho ya na ho.
//  Agar store-specific filtering chahiye to CategoryScreen storeFilter
//  browse API ko pass karta hai — categories list same rehti hai.
// ---------------------------------------------------------------------------
export async function getCategories(store?: string): Promise<Category[]> {
  // Optionally filter to only categories that exist for this store
  if (store) {
    try {
      const dbCats = await fetchStoreCategories(store);
      if (dbCats && dbCats.length > 0) {
        const dbKeys = new Set(dbCats.map((c) => c.category?.toLowerCase()));
        const filtered = CATEGORIES.filter((c) => dbKeys.has(c.key));
        if (filtered.length > 0) return filtered;
      }
    } catch {
      // DB offline — return all
    }
  }
  return fakeLatency(CATEGORIES);
}

export async function getTrendingSearches(): Promise<string[]> {
  return fakeLatency(MOCK_TRENDING);
}

export async function getBestDrops(): Promise<Deal[]> {
  try {
    const apiResults = await fetchSearchProducts('laptop');
    if (apiResults && apiResults.length > 0) {
      return apiResults.slice(0, 8).map((item, idx) => ({
        id: item.handle || String(idx),
        idNum: item.id,
        name: item.title,
        price: formatPrice(item.price),
        discount: 'HOT',
        store: item.store || 'Mega.pk',
        imageSeed: item.handle || item.title,
        handle: item.handle,
        imageUrl: item.imageUrl,
        url: item.url,
      }));
    }
  } catch {
    // offline
  }
  return fakeLatency(MOCK_DEALS);
}

// ---------------------------------------------------------------------------
//  SUB-CATEGORIES — ab koi subcategory nahi, har category seedhi final hai.
//  Lekin CategoryScreen ko ek Subcategory[] chahiye, to ek hi "All" item de do.
// ---------------------------------------------------------------------------
export async function getSubcategories(categoryKey: string, _store?: string): Promise<Subcategory[]> {
  const cat = CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return fakeLatency([]);
  // Single "All" sub with the category's own query
  return fakeLatency([
    { key: categoryKey, label: cat.label, imageTag: 'package', products: [] },
  ]);
}

// sub key -> DB query term. Ab seedha category key hi query hai.
export function subQueryFor(_categoryKey: string, subKey: string): string {
  return subKey; // direct DB slug
}

export async function searchProducts(query: string, store?: string): Promise<SubcategoryProduct[]> {
  const q = query.trim();
  if (!q) return fakeLatency([]);

  try {
    const apiResults = await fetchSearchProducts(q, store);
    if (apiResults && apiResults.length > 0) {
      return apiResults.map((item) => ({
        id: item.id,
        name: item.title,
        price: formatPrice(item.price),
        pictureTag: item.title,
        handle: item.handle,
        imageUrl: item.imageUrl,
        url: item.url,
        store: item.store,
        currency: item.currency,
        hasComparison: item.hasComparison,
      }));
    }
  } catch {
    // offline
  }
  return fakeLatency([]);
}