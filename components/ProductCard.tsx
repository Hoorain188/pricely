import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { STORE_META } from "../constants/mockSearchData";
import { Category, Product } from "../types/product";

const CATEGORY_ICON: Record<
  Category,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  phone: "cellphone",
  battery: "battery",
  shoe: "shoe-sneaker",
  appliance: "microwave",
};

function formatPrice(value: number): string {
  return `Rs ${value.toLocaleString("en-PK")}`;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const inStockOffers = product.offers.filter((o) => o.inStock);
  const allOutOfStock = inStockOffers.length === 0;

  const bestOffer = allOutOfStock
    ? [...product.offers].sort((a, b) => a.price - b.price)[0]
    : [...inStockOffers].sort((a, b) => a.price - b.price)[0];

  const matchedCount = product.offers.length;
  const storeMeta = STORE_META[bestOffer.storeId];

  const showImage = Boolean(product.imageUrl) && !imageFailed;

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        {showImage ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.iconFallback}>
            <MaterialCommunityIcons
              name={CATEGORY_ICON[product.category]}
              size={32}
              color="#1a7a5e"
            />
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text
          style={[styles.name, allOutOfStock && styles.nameMuted]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {allOutOfStock ? (
          <Text style={styles.outOfStock}>Out of stock everywhere</Text>
        ) : (
          <Text style={styles.matched}>
            Matched across {matchedCount} stores
          </Text>
        )}

        <View style={styles.priceRow}>
          {product.isBestDeal && !allOutOfStock && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Best price</Text>
            </View>
          )}
          <View style={styles.priceSpacer} />
          <Text style={[styles.price, allOutOfStock && styles.priceStruck]}>
            {formatPrice(bestOffer.price)}
          </Text>
        </View>

        {!allOutOfStock && (
          <View style={styles.storeRow}>
            <View style={styles.storeLeft}>
              <View
                style={[
                  styles.storeAvatar,
                  { backgroundColor: storeMeta.color },
                ]}
              >
                <Text style={styles.storeAvatarText}>{storeMeta.label}</Text>
              </View>
              <Text style={styles.storeName}>{bestOffer.storeName}</Text>
            </View>
            <Text style={styles.inStock}>In stock</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#eaf3ee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  iconFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1c1c1c",
  },
  nameMuted: {
    color: "#8a8a8a",
    fontWeight: "500",
  },
  matched: {
    fontSize: 13,
    color: "#8a8a8a",
    marginTop: 3,
  },
  outOfStock: {
    fontSize: 13,
    color: "#d64545",
    marginTop: 3,
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  priceSpacer: {
    flex: 1,
  },
  badge: {
    backgroundColor: "#f0a93c",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2a2000",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#166b52",
  },
  priceStruck: {
    color: "#a3a3a3",
    textDecorationLine: "line-through",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  storeLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  storeAvatarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  storeName: {
    fontSize: 14,
    color: "#4a4a4a",
  },
  inStock: {
    marginLeft: "auto",
    fontSize: 14,
    color: "#2f6fed",
    fontWeight: "500",
  },
});
