export type Category = "phone" | "battery" | "shoe" | "appliance";

export interface StoreOffer {
  storeId: string;
  storeName: string;
  price: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  offers: StoreOffer[];
  /** raw listing count before dedupe (e.g. multiple variants/sellers folded into this one product) */
  totalListings: number;
  /** flags this card with the "Best price" badge */
  isBestDeal?: boolean;
  /** product photo URL; falls back to a category icon in the UI when omitted */
  imageUrl?: string;
}
