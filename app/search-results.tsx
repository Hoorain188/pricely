import Feather from "@expo/vector-icons/Feather";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FilterChip from "../components/FilterChip";
import ProductCard from "../components/ProductCard";
import { MOCK_PRODUCTS } from "../constants/mockSearchData";
import { Product } from "../types/product";

type SortDirection = "asc" | "desc";

function bestPrice(product: Product): number {
  const inStock = product.offers.filter((o) => o.inStock);
  const pool = inStock.length > 0 ? inStock : product.offers;
  return Math.min(...pool.map((o) => o.price));
}

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(params.q ?? "redmi note 13");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const storeNames = useMemo((): [string, string][] => {
    const names = new Map<string, string>();
    MOCK_PRODUCTS.forEach((p: Product) =>
      p.offers.forEach((o) => names.set(o.storeId, o.storeName)),
    );
    return Array.from(names.entries());
  }, []);

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId)
        ? prev.filter((s) => s !== storeId)
        : [...prev, storeId],
    );
  };

  const filtered = useMemo((): Product[] => {
    let results: Product[] = MOCK_PRODUCTS.filter((p: Product) =>
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
    );

    if (selectedStores.length > 0) {
      results = results.filter((p) =>
        p.offers.some((o) => selectedStores.includes(o.storeId)),
      );
    }

    if (inStockOnly) {
      results = results.filter((p) => p.offers.some((o) => o.inStock));
    }

    // When a store filter is active, restrict each product's offers to just
    // that store — otherwise the card still shows its cheapest offer overall,
    // which can be a different store than the one you filtered by.
    if (selectedStores.length > 0) {
      results = results.map((p) => ({
        ...p,
        offers: p.offers.filter((o) => selectedStores.includes(o.storeId)),
      }));
    }

    results = [...results].sort((a, b) => {
      const diff = bestPrice(a) - bestPrice(b);
      return sortDir === "asc" ? diff : -diff;
    });

    return results;
  }, [query, selectedStores, inStockOnly, sortDir]);

  const totalListings = filtered.reduce(
    (sum: number, p: Product) => sum + p.totalListings,
    0,
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // No previous screen in the stack — send the user home instead
      // of letting GO_BACK fail silently.
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="chevron-left" size={22} color="#2f6fed" />
        </Pressable>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#8a8a8a" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products…"
            placeholderTextColor="#a3a3a3"
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
      </View>

      <Text style={styles.resultCount}>
        {filtered.length} match{filtered.length === 1 ? "" : "es"} · deduped
        from {totalListings} listings
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
        removeClippedSubviews={false}
      >
        <FilterChip
          label="Sort: Price"
          active
          iconName={sortDir === "asc" ? "arrow-up" : "arrow-down"}
          onPress={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />
        <FilterChip
          label="In stock"
          active={inStockOnly}
          onPress={() => setInStockOnly((v) => !v)}
        />
        {storeNames.map(([storeId, storeName]) => (
          <FilterChip
            key={storeId}
            label={storeName}
            active={selectedStores.includes(storeId)}
            onPress={() => toggleStore(storeId)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={28} color="#c4c4c4" />
            <Text style={styles.emptyText}>No products match your filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f4ef",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#e4ecff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1c1c1c",
  },
  resultCount: {
    fontSize: 14,
    color: "#8a8a8a",
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  filterRow: {
    flexGrow: 0,
    height: 56,
    marginBottom: 16,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    paddingVertical: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: "#8a8a8a",
  },
});
