import { fetchSearchProducts, fetchStoreCategories, formatPrice } from './api';

export interface Category {
  key: string;
  label: string;
}

export interface Deal {
  id: string;
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
  name: string;
  price: string;
  pictureTag?: string;
  handle?: string;
  imageUrl?: string;
  url?: string;
  store?: string;
  currency?: string;
}

export interface Subcategory {
  key: string;
  label: string;
  imageTag: string;
  products: SubcategoryProduct[];
}

// ---------------------------------------------------------------------------
//  TOP-LEVEL CATEGORIES (home screen tabs). "electronics" chhatri hai jismein
//  mobiles/laptops/tv sab sub ke taur par aate hain.
// ---------------------------------------------------------------------------
const MOCK_CATEGORIES: Category[] = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'home', label: 'Home & Living' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'appliances', label: 'Appliances' },
  { key: 'watches', label: 'Watches & Accessories' },
];

const MOCK_TRENDING = ['Redmi Note 13', 'Air Fryer 5L', 'PS5 slim', 'iPhone 15', 'Nike Air Max 90', 'Smart Watch'];

const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Redmi Note 13 8/256', price: 'Rs 54,999', discount: '12%', store: 'Telemart', imageSeed: 'redmi-note-13' },
  { id: '2', name: 'Anker 20000mAh PB', price: 'Rs 8,450', discount: '20%', store: 'Daraz', imageSeed: 'anker-powerbank' },
  { id: '3', name: 'Nike Air Max 90', price: 'Rs 15,200', discount: '18%', store: 'Daraz', imageSeed: 'nike-air-max' },
  { id: '4', name: 'Samsung 55" 4K TV', price: 'Rs 124,999', discount: '15%', store: 'Amazon', imageSeed: 'samsung-tv' },
  { id: '5', name: 'Xiaomi Air Fryer 5L', price: 'Rs 11,999', discount: '10%', store: 'Mega.pk', imageSeed: 'air-fryer' },
];

// ===========================================================================
//  SUB-CATEGORY DEFINITIONS
//  Har sub-category ka ek `query` hai jo DB ke `category` column se match karta
//  hai (browse endpoint isi se products laata hai). `imageTag` icon ke liye.
//  Telemart: iphones, androids, audio, gaming, power banks, beauty, fashion, appliances
//  Mega.pk: mobiles, headphones, gaming_consoles, power_banks, + detailed subs
//  NormalizeCategory (backend) dono ko milata hai via contains matching.
// ===========================================================================
interface SubDef { key: string; label: string; imageTag: string; query: string; }

const SUBDEFS: Record<string, SubDef[]> = {
  electronics: [
    { key: 'iphones', label: 'iPhones', imageTag: 'iphone', query: 'iphones' },
    { key: 'androids', label: 'Android', imageTag: 'smartphone', query: 'androids' },
    { key: 'mobiles', label: 'All Mobiles', imageTag: 'smartphone', query: 'mobiles' },
    { key: 'laptops', label: 'Laptops', imageTag: 'laptop', query: 'laptops' },
    { key: 'tablets', label: 'Tablets', imageTag: 'tablet', query: 'tablets' },
    { key: 'monitors', label: 'Monitors', imageTag: 'monitor', query: 'monitors' },
    { key: 'cameras', label: 'Cameras', imageTag: 'camera', query: 'cameras' },
    { key: 'tvs', label: 'Televisions', imageTag: 'television', query: 'televisions' },
    { key: 'printers', label: 'Printers', imageTag: 'monitor', query: 'printers' },
    { key: 'gaming', label: 'Gaming', imageTag: 'videogames', query: 'gaming' },
    { key: 'audio', label: 'Audio', imageTag: 'headphones', query: 'audio' },
    { key: 'powerbanks', label: 'Power Banks', imageTag: 'battery', query: 'power_banks' },
    { key: 'desktops', label: 'Desktops', imageTag: 'monitor', query: 'desktop_computers' },
    { key: 'projectors', label: 'Projectors', imageTag: 'monitor', query: 'projectors' },
    { key: 'accessories', label: 'Accessories', imageTag: 'package', query: 'accessories' },
  ],
  appliances: [
    { key: 'all-appliances', label: 'All', imageTag: 'plug', query: 'appliances' },
    { key: 'acs', label: 'Air Conditioners', imageTag: 'airconditioner', query: 'air_conditioners' },
    { key: 'fridge', label: 'Refrigerators', imageTag: 'refrigerator', query: 'fridge' },
    { key: 'washing', label: 'Washing Machines', imageTag: 'washingmachine', query: 'washing_machine' },
    { key: 'microwave', label: 'Microwave Ovens', imageTag: 'kitchenware', query: 'microwave' },
    { key: 'freezer', label: 'Freezers', imageTag: 'refrigerator', query: 'freezer' },
    { key: 'fans', label: 'Fans', imageTag: 'fan', query: 'fans' },
  ],
  watches: [
    { key: 'smart', label: 'Smart Watches', imageTag: 'smartwatch', query: 'watches' },
    { key: 'power', label: 'Power Banks', imageTag: 'battery', query: 'power_banks' },
  ],
  beauty: [
    { key: 'all-beauty', label: 'All Beauty', imageTag: 'sparkles', query: 'beauty' },
    { key: 'skincare', label: 'Skincare', imageTag: 'skincare', query: 'skincare' },
    { key: 'makeup', label: 'Makeup', imageTag: 'makeup', query: 'makeup' },
    { key: 'fragrances', label: 'Fragrances', imageTag: 'perfume', query: 'fragrances' },
  ],
  fashion: [
    { key: 'all-fashion', label: 'All Fashion', imageTag: 'mensfashion', query: 'fashion' },
    { key: 'menswear', label: "Men's Wear", imageTag: 'mensfashion', query: 'menswear' },
    { key: 'womenswear', label: "Women's Wear", imageTag: 'womensfashion', query: 'womenswear' },
    { key: 'footwear', label: 'Footwear', imageTag: 'sneakers', query: 'footwear' },
  ],
  home: [
    { key: 'all-home', label: 'All Home', imageTag: 'furniture', query: 'home' },
    { key: 'furniture', label: 'Furniture', imageTag: 'furniture', query: 'furniture' },
    { key: 'kitchenware', label: 'Kitchenware', imageTag: 'kitchenware', query: 'kitchenware' },
    { key: 'bedding', label: 'Bedding', imageTag: 'bedroom', query: 'bedding' },
    { key: 'lighting', label: 'Lighting', imageTag: 'lamp', query: 'lighting' },
  ],
};

const CATEGORY_TO_SUB: Record<string, string> = {
  // Phones
  mobiles: 'mobiles', iphones: 'iphones', androids: 'androids',
  // Laptops & Computing
  laptops: 'laptops', tablets: 'tablets', monitors: 'monitors', desktop_computers: 'desktops', servers: 'desktops',
  // Cameras
  cameras: 'cameras', digital_cameras: 'cameras', mirrorless_cameras: 'cameras', camera_lenses: 'cameras',
  // TV & Printers & Gaming & Audio
  televisions: 'tvs', printers: 'printers', inkjet_printers: 'printers', multifunction_printers: 'printers',
  gaming: 'gaming', gaming_consoles: 'gaming', audio: 'audio', headphones: 'audio', home_theater: 'audio',
  power_banks: 'powerbanks', 'power banks': 'powerbanks', projectors: 'projectors', accessories: 'accessories',
  // Appliances
  appliances: 'all-appliances', air_conditioners: 'acs', fridge: 'fridge',
  washing_machine: 'washing', microwave: 'microwave', freezer: 'freezer', fans: 'fans',
  kitchen_appliances: 'all-appliances', irons: 'all-appliances', heaters: 'all-appliances', geyser: 'all-appliances',
  // Beauty
  beauty: 'all-beauty', skincare: 'skincare', makeup: 'makeup', fragrances: 'fragrances',
  // Fashion
  fashion: 'all-fashion', menswear: 'menswear', womenswear: 'womenswear', footwear: 'footwear',
  // Home
  home: 'all-home', furniture: 'furniture', kitchenware: 'kitchenware', bedding: 'bedding', lighting: 'lighting',
  // Watches
  watches: 'smart',
};

// ---------------------------------------------------------------------------
//  Fashion / beauty / home — now backed by Telemart data after re-sync.
//  MOCK_SUBCATEGORIES only used as fallback if no SUBDEFS entry exists.
// ---------------------------------------------------------------------------
const MOCK_SUBCATEGORIES: Record<string, Subcategory[]> = {
  home: [
    { key: 'furniture', label: 'Furniture', imageTag: 'furniture', products: [] },
    { key: 'kitchenware', label: 'Kitchenware', imageTag: 'kitchenware', products: [] },
    { key: 'bedding', label: 'Bedding', imageTag: 'bedroom', products: [] },
    { key: 'lighting', label: 'Lighting', imageTag: 'lamp', products: [] },
  ],
};

// build a Subcategory[] from SubDef[] (products khaali — CategoryScreen API se bhar deta hai)
function subsFromDefs(defs: SubDef[]): Subcategory[] {
  return defs.map((d) => ({ key: d.key, label: d.label, imageTag: d.imageTag, products: [] }));
}

// sub key -> DB query term (CategoryScreen isse browse call karta hai)
export function subQueryFor(categoryKey: string, subKey: string): string {
  const defs = SUBDEFS[categoryKey];
  const found = defs?.find((d) => d.key === subKey);
  return found?.query || subKey;
}

export const dealImageUri = (seed: string) => `https://picsum.photos/seed/${seed}/300/300`;

const fakeLatency = <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 200));

// ---------------------------------------------------------------------------
//  CATEGORIES — agar store diya ho to sirf us store ki asal categories (DB se).
//  Store na ho to poori list.
// ---------------------------------------------------------------------------
// SubDef definition for Mega.pk specific electronics subcategories:
// Mega has detailed categories (headphones, gaming_consoles, power_banks etc.)
// but the browse NormalizeCategory maps them to unified names.
const MEGA_ELECTRONICS_SUBDEFS: SubDef[] = [
  { key: 'mobiles', label: 'Mobiles', imageTag: 'smartphone', query: 'mobiles' },
  { key: 'laptops', label: 'Laptops', imageTag: 'laptop', query: 'laptops' },
  { key: 'tablets', label: 'Tablets', imageTag: 'tablet', query: 'tablets' },
  { key: 'monitors', label: 'Monitors', imageTag: 'monitor', query: 'monitors' },
  { key: 'cameras', label: 'Cameras', imageTag: 'camera', query: 'cameras' },
  { key: 'tvs', label: 'Televisions', imageTag: 'television', query: 'televisions' },
  { key: 'printers', label: 'Printers', imageTag: 'monitor', query: 'printers' },
  { key: 'gaming', label: 'Gaming', imageTag: 'videogames', query: 'gaming' },
  { key: 'audio', label: 'Audio', imageTag: 'headphones', query: 'audio' },
  { key: 'powerbanks', label: 'Power Banks', imageTag: 'battery', query: 'power_banks' },
  { key: 'watches', label: 'Watches', imageTag: 'smartwatch', query: 'watches' },
  { key: 'projectors', label: 'Projectors', imageTag: 'monitor', query: 'projectors' },
  { key: 'accessories', label: 'Accessories', imageTag: 'package', query: 'accessories' },
];

export async function getCategories(store?: string): Promise<Category[]> {
  if (!store) return fakeLatency(MOCK_CATEGORIES);

  const cleanStore = store.trim().toLowerCase();
  if (cleanStore === 'mega.pk' || cleanStore === 'megapk') {
    // Mega.pk has ONLY electronics
    return fakeLatency([{ key: 'electronics', label: 'Electronics' }]);
  }

  if (cleanStore === 'telemart') {
    // Telemart has data across all categories
    return fakeLatency(MOCK_CATEGORIES.filter((c) => c.key !== 'all'));
  }

  try {
    const dbCats = await fetchStoreCategories(store); // [{category, count}]
    if (dbCats && dbCats.length > 0) {
      const hasElectronics = dbCats.some((c) => CATEGORY_TO_SUB[c.category]);
      const hasAppliances = dbCats.some((c) =>
        ['air_conditioners', 'fridge', 'washing_machine', 'microwave', 'freezer', 'fans'].includes(c.category));

      const cats: Category[] = [];
      if (hasElectronics) cats.push({ key: 'electronics', label: 'Electronics' });
      if (hasAppliances || dbCats.some((c) => c.category === 'appliances'))
        cats.push({ key: 'appliances', label: 'Appliances' });
      if (dbCats.some((c) => c.category === 'watches')) cats.push({ key: 'watches', label: 'Watches' });
      if (dbCats.some((c) => c.category === 'beauty')) cats.push({ key: 'beauty', label: 'Beauty' });
      if (dbCats.some((c) => c.category === 'fashion')) cats.push({ key: 'fashion', label: 'Fashion' });

      return cats.length > 0 ? cats : [{ key: 'electronics', label: 'Electronics' }];
    }
  } catch {
    // DB offline — mock
  }
  return fakeLatency(MOCK_CATEGORIES.filter((c) => c.key !== 'all'));
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
//  SUB-CATEGORIES — store-aware. Electronics/appliances/watches DB-backed defs
//  se; fashion/beauty/home mock.
// ---------------------------------------------------------------------------
export async function getSubcategories(categoryKey: string, store?: string): Promise<Subcategory[]> {
  const cleanStore = (store || '').trim().toLowerCase();
  
  if (cleanStore === 'mega.pk' || cleanStore === 'megapk') {
    // Mega.pk only has electronics subcategories
    if (categoryKey === 'electronics' || categoryKey === 'all') {
      return fakeLatency(subsFromDefs(MEGA_ELECTRONICS_SUBDEFS));
    }
    return fakeLatency([]);
  }

  const defs = SUBDEFS[categoryKey];
  if (defs) {
    return fakeLatency(subsFromDefs(defs));
  }
  return fakeLatency(MOCK_SUBCATEGORIES[categoryKey] || []);
}

export async function searchProducts(query: string, store?: string): Promise<SubcategoryProduct[]> {
  const q = query.trim();
  if (!q) return fakeLatency([]);

  try {
    const apiResults = await fetchSearchProducts(q, store);
    if (apiResults && apiResults.length > 0) {
      return apiResults.map((item) => ({
        name: item.title,
        price: formatPrice(item.price),
        pictureTag: item.title,
        handle: item.handle,
        imageUrl: item.imageUrl,
        url: item.url,
        store: item.store,
        currency: item.currency,
      }));
    }
  } catch {
    // offline
  }
  return fakeLatency([]);
}