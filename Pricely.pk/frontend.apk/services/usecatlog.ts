import { useEffect, useState } from 'react';
import { fetchProductDetail, ProductDetail } from '../services/api';
import { Category, Deal, getBestDrops, getCategories, getSubcategories, getTrendingSearches, Subcategory } from '../services/catalogService';

// Thin data hooks — screens call these instead of importing static arrays.
// useCategories/useSubcategories ab optional `store` lete hain: store diya to
// sirf us store ki asal categories/subs (DB se) aati hain.

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