import { Product } from '../types/product';

// Color + initial shown on the little store badge. Add an entry here whenever
// you introduce a new store in the offers below.
export const STORE_META: Record<string, { label: string; color: string }> = {
  telemart: { label: 'T', color: '#1a7a5e' },
  daraz: { label: 'D', color: '#e0245e' },
  megapk: { label: 'M', color: '#2d5be0' },
  priceoye: { label: 'P', color: '#7c3aed' },
  shophive: { label: 'S', color: '#f59e0b' },
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Redmi Note 13 8GB/256GB',
    category: 'phone',
    totalListings: 9,
    isBestDeal: true,
    offers: [
      { storeId: 'telemart', storeName: 'Telemart', price: 54999, inStock: true },
      { storeId: 'daraz', storeName: 'Daraz', price: 55999, inStock: true },
      { storeId: 'megapk', storeName: 'Mega.pk', price: 56500, inStock: true },
      { storeId: 'priceoye', storeName: 'PriceOye', price: 57200, inStock: false },
    ],
  },
  {
    id: 'p2',
    name: 'Anker PowerCore 20000mAh',
    category: 'battery',
    totalListings: 5,
    offers: [
      { storeId: 'daraz', storeName: 'Daraz', price: 8450, inStock: true },
      { storeId: 'telemart', storeName: 'Telemart', price: 8990, inStock: true },
      { storeId: 'megapk', storeName: 'Mega.pk', price: 9200, inStock: true },
    ],
  },
  {
    id: 'p3',
    name: 'Nike Air Zoom Pegasus 40',
    category: 'shoe',
    totalListings: 4,
    offers: [
      { storeId: 'daraz', storeName: 'Daraz', price: 21900, inStock: false },
      { storeId: 'shophive', storeName: 'Shophive', price: 22500, inStock: false },
    ],
  },
  {
    id: 'p4',
    name: 'Philips Air Fryer HD9200 5L',
    category: 'appliance',
    totalListings: 7,
    offers: [
      { storeId: 'megapk', storeName: 'Mega.pk', price: 16250, inStock: true },
      { storeId: 'telemart', storeName: 'Telemart', price: 16800, inStock: true },
      { storeId: 'daraz', storeName: 'Daraz', price: 17100, inStock: true },
      { storeId: 'priceoye', storeName: 'PriceOye', price: 17500, inStock: false },
    ],
  },
  {
    id: 'p5',
    name: 'Samsung Galaxy A55 8/128',
    category: 'phone',
    totalListings: 6,
    offers: [
      { storeId: 'telemart', storeName: 'Telemart', price: 74999, inStock: true },
      { storeId: 'daraz', storeName: 'Daraz', price: 75999, inStock: true },
      { storeId: 'megapk', storeName: 'Mega.pk', price: 76500, inStock: false },
    ],
  },
  {
    id: 'p6',
    name: 'Xiaomi 20000mAh Power Bank',
    category: 'battery',
    totalListings: 3,
    offers: [
      { storeId: 'priceoye', storeName: 'PriceOye', price: 6200, inStock: true },
      { storeId: 'shophive', storeName: 'Shophive', price: 6350, inStock: true },
    ],
  },
  {
    id: 'p7',
    name: 'Adidas Ultraboost 22',
    category: 'shoe',
    totalListings: 5,
    offers: [
      { storeId: 'daraz', storeName: 'Daraz', price: 24999, inStock: true },
      { storeId: 'shophive', storeName: 'Shophive', price: 25999, inStock: true },
      { storeId: 'megapk', storeName: 'Mega.pk', price: 26500, inStock: true },
    ],
  },
  {
    id: 'p8',
    name: 'Dawlance Microwave Oven 20L',
    category: 'appliance',
    totalListings: 4,
    offers: [
      { storeId: 'megapk', storeName: 'Mega.pk', price: 28500, inStock: true },
      { storeId: 'telemart', storeName: 'Telemart', price: 29200, inStock: true },
    ],
  },
];