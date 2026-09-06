import { create } from 'zustand';

export interface FavoriteItem {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  priceDrop?: string;
  statusText?: string;
  categoryKey?: string;
  handle?: string;
  store?: string;
}

export interface PriceAlert {
  id: string;
  name: string;
  targetPrice: string;
  currentPrice: string;
  remainingPrice: string;
  active: boolean;
  imageUrl?: string;
  categoryKey?: string;
  store?: string;
}

interface UserStoreState {
  favorites: FavoriteItem[];
  alerts: PriceAlert[];
  
  // Actions
  toggleFavorite: (product: { name: string; price: string; imageUrl?: string; categoryKey?: string; handle?: string; store?: string }) => void;
  isFavorited: (productName: string) => boolean;
  addAlert: (product: { name: string; targetPrice: string; currentPrice: string; imageUrl?: string; categoryKey?: string; store?: string }) => void;
  toggleAlertActive: (id: string) => void;
  removeAlert: (id: string) => void;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  favorites: [],
  alerts: [],

  toggleFavorite: (product) => {
    const { favorites } = get();
    const exists = favorites.some((f) => f.name === product.name);
    
    if (exists) {
      set({ favorites: favorites.filter((f) => f.name !== product.name) });
    } else {
      const dropVal = Math.floor(Math.random() * 3500) + 1500; // dynamic drop of Rs 1,500 - 5,000
      const newFav: FavoriteItem = {
        id: Math.random().toString(),
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        priceDrop: `▼ Rs ${dropVal.toLocaleString()} since saved`,
        statusText: `Watching on ${product.store || '3 stores'}`,
        categoryKey: product.categoryKey,
        handle: product.handle,
        store: product.store,
      };
      set({ favorites: [...favorites, newFav] });
    }
  },

  isFavorited: (productName) => {
    return get().favorites.some((f) => f.name === productName);
  },

  addAlert: (product) => {
    const { alerts } = get();
    const targetVal = parseFloat(product.targetPrice.replace(/[^0-9.]/g, '')) || 0;
    const currentVal = parseFloat(product.currentPrice.replace(/[^0-9.]/g, '')) || 0;
    const diff = Math.max(0, currentVal - targetVal);

    const newAlert: PriceAlert = {
      id: Math.random().toString(),
      name: product.name,
      targetPrice: `Rs ${targetVal.toLocaleString()}`,
      currentPrice: product.currentPrice,
      remainingPrice: diff > 0 ? `Rs ${diff.toLocaleString()} to go` : 'Target reached!',
      active: true,
      imageUrl: product.imageUrl,
      categoryKey: product.categoryKey,
      store: product.store,
    };
    set({ alerts: [...alerts, newAlert] });
  },

  toggleAlertActive: (id) => {
    set({
      alerts: get().alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
    });
  },

  removeAlert: (id) => {
    set({
      alerts: get().alerts.filter((a) => a.id !== id),
    });
  },
}));
