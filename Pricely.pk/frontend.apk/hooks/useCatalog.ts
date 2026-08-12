import { useEffect, useState } from 'react';
import { getCategories, getTrendingSearches, getBestDrops, getSubcategories, Category, Deal, Subcategory } from '../services/catalogService';
import { fetchProductDetail, ProductDetail } from '../services/api';

// Thin data hooks — HomeScreen calls these instead of importing static
// arrays, so switching catalogService's internals to real network calls
// later requires zero changes here or in the screen.

export function useCategories(store?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCategories(store).then((data) => {
      if (alive) {
        setCategories(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [store]);

  return { categories, loading };
}

export function useTrendingSearches() {
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getTrendingSearches().then((data) => {
      if (alive) {
        setTrending(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { trending, loading };
}

export function useBestDrops() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getBestDrops().then((data) => {
      if (alive) {
        setDeals(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { deals, loading };
}

export function useSubcategories(categoryKey: string, store?: string) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getSubcategories(categoryKey, store).then((data) => {
      if (alive) {
        setSubcategories(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [categoryKey, store]);

  return { subcategories, loading };
}

export function useProductDetail(handle: string) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!handle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchProductDetail(handle)
      .then((data) => {
        if (alive) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (alive) {
          setError(err?.message || 'Failed to load product detail');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  return { detail, loading, error };
}



