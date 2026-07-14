// Data layer for the Home screen. Every function here returns a Promise,
// on purpose — that's the real shape a fetch() call will have. When the
// backend exists, only the bodies in this file change (swap the mock
// array for a real `fetch(...).then(r => r.json())`); nothing in the UI
// components needs to change, since they only ever talk to these
// functions/hooks, never to hardcoded arrays directly.

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
  imageSeed: string; // used to build a stable demo photo URL until real product images exist
}

const MOCK_CATEGORIES: Category[] = [
  { key: 'all', label: 'All' },
  { key: 'mobiles', label: 'Mobiles' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'home', label: 'Home & Living' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'appliances', label: 'Appliances' },
];

const MOCK_TRENDING = ['Redmi Note 13', 'Air Fryer 5L', 'PS5 slim', 'iPhone 15', 'Nike Air Max 90', 'Smart Watch'];

const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Redmi Note 13 8/256', price: 'Rs 54,999', discount: '12%', store: 'Telemart', imageSeed: 'redmi-note-13' },
  { id: '2', name: 'Anker 20000mAh PB', price: 'Rs 8,450', discount: '20%', store: 'Daraz', imageSeed: 'anker-powerbank' },
  { id: '3', name: 'Nike Air Max 90', price: 'Rs 15,200', discount: '18%', store: 'Daraz', imageSeed: 'nike-air-max' },
  { id: '4', name: 'Samsung 55" 4K TV', price: 'Rs 124,999', discount: '15%', store: 'Amazon', imageSeed: 'samsung-tv' },
  { id: '5', name: 'Xiaomi Air Fryer 5L', price: 'Rs 11,999', discount: '10%', store: 'Mega.pk', imageSeed: 'air-fryer' },
];

// Fixed picsum.photos IDs that visually match each product category.
// picsum.photos/id/{n}/300/300 is reliable in RN (no CORS, no redirects).
const SEED_IMAGE_IDS: Record<string, number> = {
  'redmi-note-13': 180,    // tech/device
  'anker-powerbank': 305,  // electronics
  'nike-air-max': 142,     // fashion/shoes
  'samsung-tv': 366,       // screen/display
  'air-fryer': 431,        // kitchen
};

export const dealImageUri = (seed: string): string => {
  const id = SEED_IMAGE_IDS[seed] ?? 10;
  return `https://picsum.photos/id/${id}/300/300`;
};

const fakeLatency = <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 250));

export async function getCategories(): Promise<Category[]> {
  // TODO: backend — GET /catalog/categories
  return fakeLatency(MOCK_CATEGORIES);
}

export async function getTrendingSearches(): Promise<string[]> {
  // TODO: backend — GET /search/trending
  return fakeLatency(MOCK_TRENDING);
}

export async function getBestDrops(): Promise<Deal[]> {
  // TODO: backend — GET /deals/best-drops
  return fakeLatency(MOCK_DEALS);
}
