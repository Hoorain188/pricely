import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Search, SlidersHorizontal, Flame, X, ArrowLeft } from 'lucide-react-native';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { searchProducts, SubcategoryProduct } from '../services/catalogService';
import { loremflickrUri } from '../components/CategoryCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const RECENT_SEARCHES = ['Redmi Note 13', 'iPhone 15', 'Air Fryer 5L', 'PS5 Slim', 'Nike Air Max'];

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [query, setQuery] = useState(route.params?.query || '');
  const [results, setResults] = useState<SubcategoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('All');

  useEffect(() => {
    if (route.params?.query) {
      setQuery(route.params.query);
    }
  }, [route.params?.query]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    searchProducts(query).then((res) => {
      setResults(res);
      setLoading(false);
    });
  }, [query]);

  const filteredResults = results.filter((item, index) => {
    if (selectedStore === 'All') return true;
    const stores = ['Daraz', 'Telemart', 'Mega.pk', 'Amazon'];
    return stores[index % stores.length] === selectedStore;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header with back button & search input */}
      <LinearGradient
        colors={gradients.primary}
        locations={gradients.primaryLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.onDarkPrimary} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Search size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, brands or stores..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={styles.searchInput}
            autoFocus={!route.params?.query}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Store Filter Pills */}
      <View style={styles.filterRow}>
        {['All', 'Daraz', 'Telemart', 'Mega.pk', 'Amazon'].map((store) => {
          const active = selectedStore === store;
          return (
            <TouchableOpacity
              key={store}
              style={[styles.storePill, active && styles.storePillActive]}
              onPress={() => setSelectedStore(store)}
            >
              <Text style={[styles.storePillText, active && styles.storePillTextActive]}>{store}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {query.trim().length === 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Popular & Recent Searches</Text>
            <View style={styles.recentGrid}>
              {RECENT_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.recentChip}
                  onPress={() => setQuery(term)}
                >
                  <Flame size={14} color={colors.adminAccent} />
                  <Text style={styles.recentText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {loading ? 'Searching...' : `${filteredResults.length} Products Found`}
              </Text>
            </View>

            <View style={styles.grid}>
              {filteredResults.map((product, i) => (
                <TouchableOpacity
                  key={`${product.name}-${i}`}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      productName: product.name,
                      currentPrice: product.price,
                    })
                  }
                >
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: loremflickrUri(product.pictureTag || 'product', i + 1) }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!loading && filteredResults.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySubtitle}>Try searching for "Redmi", "iPhone", "Nike", or "TV"</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onDarkPrimary,
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storePillActive: {
    backgroundColor: '#0E6B4F',
    borderColor: '#0E6B4F',
  },
  storePillText: {
    fontSize: 12,
    fontFamily: fonts.label,
    color: colors.textSecondary,
  },
  storePillTextActive: {
    color: '#FFFFFF',
  },

  content: { padding: 16, paddingBottom: 32 },

  recentSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.headlineBold, color: colors.textPrimary, marginBottom: 12 },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentTint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recentText: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary },

  resultsHeader: { marginBottom: 14 },
  resultsTitle: { fontSize: 16, fontFamily: fonts.headlineBold, color: colors.textPrimary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadows.card,
  },
  imageWrap: {
    height: 110,
    borderRadius: radii.small,
    overflow: 'hidden',
    marginBottom: 8,
  },
  image: { width: '100%', height: '100%' },
  productName: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 4 },
  productPrice: { fontSize: 15, fontFamily: fonts.monoEmphasis, color: colors.textPrimary },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.headlineBold, color: colors.textPrimary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 4 },
});
