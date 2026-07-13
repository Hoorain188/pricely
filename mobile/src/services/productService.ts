import api from './api';

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  prices: PriceEntry[];
}

export interface PriceEntry {
  store: string;
  price: number;
  url: string;
  lastUpdated: string;
}

/**
 * Search products by query
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
  const response = await api.get<Product[]>('/products/search', {
    params: { q: query },
  });
  return response.data;
};

/**
 * Get price comparison for a specific product
 */
export const getProductPrices = async (productId: string): Promise<Product> => {
  const response = await api.get<Product>(`/products/${productId}/prices`);
  return response.data;
};
