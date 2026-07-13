import { useEffect, useState } from 'react';
import { getCategories, getTrendingSearches, getBestDrops, Category, Deal } from '../services/catalogService';

// Thin data hooks — HomeScreen calls these instead of importing static
// arrays, so switching catalogService's internals to real network calls
// later requires zero changes here or in the screen.

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCategories().then((data) => {
      if (alive) {
        setCategories(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

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
