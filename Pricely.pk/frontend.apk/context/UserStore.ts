import { create } from 'zustand';
import { api, ServerAlert } from '../app/api/client';

const rupees = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/**
 * The server holds prices as numbers; these screens were written against
 * pre-formatted strings. Converting here keeps the screens untouched.
 */
function toStoreAlert(a: ServerAlert): PriceAlert {
  const remaining = Math.max(0, a.currentPrice - a.targetPrice);
  return {
    id: String(a.id),
    name: a.title,
    targetPrice: rupees(a.targetPrice),
    currentPrice: rupees(a.currentPrice),
    remainingPrice: a.isTriggered
      ? 'Target reached!'
      : remaining > 0
        ? `${rupees(remaining)} to go`
        : 'Target reached!',
    active: !a.isTriggered,
  };
}

export interface FavoriteItem {
  id: string;
  name: string;
  price: string;
  priceDrop?: string;
  statusText?: string;
  categoryKey?: string;
}

export interface PriceAlert {
  id: string;
  name: string;
  targetPrice: string;
  currentPrice: string;
  remainingPrice: string;
  active: boolean;
  categoryKey?: string;
}

interface UserStoreState {
  favorites: FavoriteItem[];
  alerts: PriceAlert[];
  
  // Actions
  toggleFavorite: (product: { name: string; price: string; categoryKey?: string }) => void;
  isFavorited: (productName: string) => boolean;
  addAlert: (product: { name: string; targetPrice: string; currentPrice: string }) => void;
  toggleAlertActive: (id: string) => void;
  removeAlert: (id: string) => void;

  /** Pulls this account's alerts from the server. Call after signing in and on the Alerts screen. */
  loadAlerts: () => Promise<void>;

  /**
   * Creates an alert the server will actually watch. Needs the listing id,
   * which addAlert never had — it only knew a product name, which is why
   * nothing could be checked against a real price.
   */
  createAlert: (storeListingId: number, targetPrice: number) => Promise<void>;

  /** Removes it on the server, then locally. */
  deleteAlert: (id: string) => Promise<void>;

  alertsLoading: boolean;
  alertsError: string | null;
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
        priceDrop: `▼ Rs ${dropVal.toLocaleString()} since saved`,
        statusText: 'Watching on 3 stores',
        categoryKey: product.categoryKey,
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

  // ── Server-backed alerts ──

  alertsLoading: false,
  alertsError: null,

  loadAlerts: async () => {
    set({ alertsLoading: true, alertsError: null });
    try {
      const server = await api.listAlerts();
      set({ alerts: server.map(toStoreAlert), alertsLoading: false });
    } catch (error: any) {
      // Whatever is already on screen stays. Blanking the list on a failed
      // refresh would read as "your alerts are gone".
      set({
        alertsLoading: false,
        alertsError: error?.message ?? 'Could not load your alerts',
      });
    }
  },

  createAlert: async (storeListingId, targetPrice) => {
    const created = await api.createAlert(storeListingId, targetPrice);
    set({ alerts: [toStoreAlert(created), ...get().alerts] });
  },

  deleteAlert: async (id) => {
    // Server first: removing it locally and then failing would show it gone
    // while the scraper still watches it.
    await api.deleteAlert(Number(id));
    set({ alerts: get().alerts.filter((a) => a.id !== id) });
  },
}));
