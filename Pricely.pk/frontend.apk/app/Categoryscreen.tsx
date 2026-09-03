import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Archive,
  Baby,
  BatteryCharging,
  BedDouble,
  Briefcase,
  Cable,
  Camera,
  Droplet,
  Fan,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  Glasses,
  Headphones,
  Lamp,
  LucideIcon,
  Monitor,
  Package,
  Palette,
  Plug,
  Refrigerator,
  Scissors,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sofa,
  Sparkles,
  SprayCan,
  Tablet,
  Tv,
  UtensilsCrossed,
  Wallet,
  Watch,
  Wind,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loremflickrUri } from '../components/CategoryCarousel';
import FilterSheet, { FilterState, sortProducts } from '../components/Filtersheet';
import LottieBackButton from '../components/Lottiebackbutton';
import LottieLoader from '../components/Lottieloader';
import LottieSearchIcon from '../components/Lottiesearchicon';
import { useCategories, useSubcategories } from '../hooks/useCatalog';
import { fetchBrowseProducts, formatPrice } from '../services/api';
import { SubcategoryProduct, searchProducts } from '../services/catalogService';
import { colors, fonts, gradients, radii, shadows } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CONTENT_PADDING * 2 - GRID_GAP) / 2;
const FLASH_WIDTH = SCREEN_WIDTH - CONTENT_PADDING * 2 - 40;
const FLASH_SNAP = FLASH_WIDTH + 10;

const getIconForTag = (tag: string): LucideIcon => {
  switch (tag.toLowerCase()) {
    case 'smartphone':
    case 'iphone':
      return Smartphone;
    case 'tablet':
      return Tablet;
    case 'watch':
    case 'smartwatch':
    case 'wristwatch':
      return Watch;
    case 'battery':
      return BatteryCharging;
    case 'cable':
      return Cable;
    case 'monitor':
    case 'laptop':
      return Monitor;
    case 'camera':
      return Camera;
    case 'television':
    case 'tv':
      return Tv;
    case 'gaming':
    case 'videogames':
      return Gamepad2;
    case 'audio':
    case 'headphones':
      return Headphones;
    case 'menswear':
    case 'mensfashion':
      return Shirt;
    case 'womenswear':
    case 'womensfashion':
    case 'shoppingbag':
      return ShoppingBag;
    case 'footwear':
    case 'sneakers':
      return Footprints;
    case 'bags':
    case 'briefcase':
    case 'handbag':
      return Briefcase;
    case 'jewelry':
    case 'gem':
      return Gem;
    case 'kidswear':
    case 'kidsfashion':
      return Baby;
    case 'skincare':
    case 'droplet':
      return Droplet;
    case 'makeup':
    case 'palette':
    case 'homedecor':
      return Palette;
    case 'haircare':
    case 'scissors':
    case 'hairstyling':
      return Scissors;
    case 'fragrances':
    case 'perfume':
    case 'spraycan':
      return SprayCan;
    case 'personalcare':
    case 'selfcare':
    case 'sparkles':
      return Sparkles;
    case 'furniture':
    case 'sofa':
      return Sofa;
    case 'kitchenware':
    case 'utensilscrossed':
      return UtensilsCrossed;
    case 'bedding':
    case 'bedroom':
    case 'beddouble':
      return BedDouble;
    case 'lighting':
    case 'lamp':
    case 'lightbulb':
      return Lamp;
    case 'storage':
    case 'archive':
      return Archive;
    case 'refrigerators':
    case 'refrigerator':
      return Refrigerator;
    case 'acs':
    case 'airconditioner':
    case 'wind':
      return Wind;
    case 'washing':
    case 'washingmachine':
    case 'fan':
      return Fan;
    case 'kitchen-appliances':
    case 'kitchenappliance':
    case 'flame':
      return Flame;
    case 'small-appliances':
    case 'kettle':
    case 'plug':
      return Plug;
    case 'sunglasses':
    case 'glasses':
      return Glasses;
    case 'wallets':
    case 'wallet':
      return Wallet;
    case 'makeupbrush':
      return Gem;
    case 'belts':
    case 'leatherbelt':
    case 'package':
    default:
      return Package;
  }
};

const FLASH_DISCOUNTS = [20, 30, 15];

const CATEGORY_SALE_TAGS: Record<string, string> = {
  mobiles_tablets: 'smartphone,phone',
  laptops_computers: 'laptop,computer',
  tv_entertainment: 'television,tv',
  home_appliances: 'appliances,fridge',
  kitchen_appliances: 'kitchen,blender',
  cameras: 'camera,dslr',
  audio: 'headphones,speaker',
  wearables: 'smartwatch,watch',
  gaming: 'gaming,playstation',
  accessories: 'charger,cable',
};

export default function CategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory: string = route.params?.categoryKey || 'mobiles_tablets';
  const storeFilter: string | undefined = route.params?.storeFilter;

  const { categories } = useCategories(storeFilter);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const { loading } = useSubcategories(activeCategory, storeFilter);

  // Refresh & Pagination state
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Transition loading logic to eliminate flash of empty grids
  const [fetching, setFetching] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const isPageLoading = fetching;

  const [searchValue, setSearchValue] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<FilterState>({ sort: 'relevance', stores: [] });
  const flashScrollX = useRef(new Animated.Value(0)).current;

  // Auto-scroll peek animation for category tabs bar (runs on mount + repeats every 10s)
  const tabScrollRef = useRef<ScrollView>(null);
  const tabUserInteractedRef = useRef(false);
  const tabTouchPauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTabTouch = () => {
    tabUserInteractedRef.current = true;
    if (tabTouchPauseTimerRef.current) {
      clearTimeout(tabTouchPauseTimerRef.current);
    }
    // Pause for 10 seconds on user touch, then auto-resume
    tabTouchPauseTimerRef.current = setTimeout(() => {
      tabUserInteractedRef.current = false;
    }, 10000);
  };

  useEffect(() => {
    if (!categories || categories.length === 0) return;

    let animationFrameId: number;

    const runPeekAnimation = () => {
      if (tabUserInteractedRef.current) return;

      let scrollPos = 0;
      const maxScroll = 280;
      let forward = true;

      const animateScroll = () => {
        if (tabUserInteractedRef.current) return;

        if (forward) {
          scrollPos += 0.7;
          if (scrollPos >= maxScroll) {
            forward = false;
          }
        } else {
          scrollPos -= 0.7;
          if (scrollPos <= 0) {
            scrollPos = 0;
            tabScrollRef.current?.scrollTo({ x: 0, animated: true });
            return;
          }
        }

        tabScrollRef.current?.scrollTo({ x: scrollPos, animated: false });
        animationFrameId = requestAnimationFrame(animateScroll);
      };

      animationFrameId = requestAnimationFrame(animateScroll);
    };

    const initialTimer = setTimeout(runPeekAnimation, 1000);
    const intervalId = setInterval(runPeekAnimation, 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      if (tabTouchPauseTimerRef.current) clearTimeout(tabTouchPauseTimerRef.current);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [categories]);

  useEffect(() => {
    if (route.params?.categoryKey) setActiveCategory(route.params.categoryKey);
  }, [route.params?.categoryKey]);

  const categoryLabel = storeFilter
    ? `${storeFilter} — ${categories.find((c) => c.key === activeCategory)?.label ?? activeCategory}`
    : (categories.find((c) => c.key === activeCategory)?.label ?? activeCategory);

  const [apiProducts, setApiProducts] = useState<SubcategoryProduct[]>([]);

  useEffect(() => {
    let alive = true;
    const queryTerm = activeCategory;

    setFetching(true);
    setApiProducts([]);
    setApiError(null);
    setPage(1);
    setHasMore(true);

    fetchBrowseProducts(queryTerm, storeFilter, seed, 1, 60)
      .then((res) => {
        if (alive && res && Array.isArray(res.results) && res.results.length > 0) {
          setApiProducts(res.results.map((item) => ({
            id: item.id,
            name: item.title,
            price: formatPrice(item.price),
            pictureTag: item.title,
            handle: item.handle,
            imageUrl: item.imageUrl || undefined,
            url: item.url,
            store: item.store,
            currency: item.currency,
            hasComparison: item.hasComparison,
            hasPriceDrop: item.hasPriceDrop,
          })));
          setHasMore(res.hasMore);
        } else if (alive) {
          searchProducts(queryTerm, storeFilter)
            .then((searchRes: SubcategoryProduct[]) => {
              if (alive) {
                setApiProducts(searchRes && searchRes.length > 0 ? searchRes : []);
                setHasMore(false);
              }
            })
            .catch(() => { if (alive) { setApiProducts([]); setHasMore(false); } });
        }
      })
      .catch((err: any) => {
        if (alive) {
          setApiError(err?.message || "Can't reach server — check connection");
          searchProducts(queryTerm, storeFilter)
            .then((searchRes: SubcategoryProduct[]) => {
              if (alive && searchRes && searchRes.length > 0) {
                setApiProducts(searchRes);
                setApiError(null);
                setHasMore(false);
              }
            })
            .catch(() => { });
        }
      })
      .finally(() => { if (alive) { setFetching(false); setRefreshing(false); } });
    return () => {
      alive = false;
    };
  }, [activeCategory, storeFilter, seed]);

  const onRefresh = () => {
    setRefreshing(true);
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || fetching || refreshing) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    fetchBrowseProducts(activeCategory, storeFilter, seed, nextPage, 60)
      .then((res) => {
        if (res && Array.isArray(res.results) && res.results.length > 0) {
          const newProducts: SubcategoryProduct[] = res.results.map((item) => ({
            id: item.id,
            name: item.title,
            price: formatPrice(item.price),
            pictureTag: item.title,
            handle: item.handle,
            imageUrl: item.imageUrl || undefined,
            url: item.url,
            store: item.store,
            currency: item.currency,
            hasComparison: item.hasComparison,
            hasPriceDrop: item.hasPriceDrop,
          }));
          setApiProducts((prev) => {
            const existingKeys = new Set(prev.map((p) => `${p.id || p.handle || p.name}`));
            const uniqueNew = newProducts.filter(
              (p) => !existingKeys.has(`${p.id || p.handle || p.name}`)
            );
            return [...prev, ...uniqueNew];
          });
          setPage(nextPage);
          setHasMore(res.hasMore);
        } else {
          setHasMore(false);
        }
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  };

  const filteredProducts = useMemo(() => {
    let list: SubcategoryProduct[] = apiProducts;
    // storeFilter is already applied at API level, no need to filter again
    if (!storeFilter && filter.stores.length > 0) {
      list = list.filter((item: SubcategoryProduct) => {
        const itemStore = item.store || '';
        return filter.stores.some(s => s.toLowerCase() === itemStore.toLowerCase());
      });
    }

    if (filter.sort === 'relevance') {
      // Sort combined products by price ascending (putting 0 or invalid prices at the end)
      const parsePrice = (p: string) => {
        const num = Number(p.replace(/[^0-9.]/g, '')) || 0;
        return num === 0 ? 99999999 : num;
      };
      return [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }
    return sortProducts(list, filter.sort);
  }, [apiProducts, filter, storeFilter]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header with back button */}
      <LinearGradient
        colors={gradients.primary}
        locations={gradients.primaryLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <LottieBackButton onPress={handleBack} size={30} />
        <Text style={styles.headerTitle}>{categoryLabel}</Text>
        <TouchableOpacity style={styles.favButton} activeOpacity={0.8} onPress={() => navigation.navigate('Favorites')}>
          <Ionicons name="heart" size={22} color={colors.onDarkPrimary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <LottieSearchIcon active={searchValue.length > 0} size={22} color={colors.textPrimary} />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            onSubmitEditing={() => {
              if (searchValue.trim()) {
                navigation.navigate('Search', { query: searchValue });
              }
            }}
            placeholder="Search products or stores"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8} onPress={() => setFilterVisible(true)}>
          <SlidersHorizontal size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Top-level category tabs */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabScrollContent}
        onScrollBeginDrag={handleTabTouch}
        onTouchStart={handleTabTouch}
      >
        {categories
          .filter((c) => c.key !== 'all')
          .map((cat) => {
            const active = cat.key === activeCategory;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                activeOpacity={0.85}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Subcategories removed — har category seedhi final hai */}

      {/* Network error banner */}
      {apiError && (
        <View style={{ backgroundColor: '#FADBD8', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.button, color: '#C0392B' }}>
            ⚠️ {apiError}
          </Text>
        </View>
      )}

      {/* Content */}
      {isPageLoading ? (
        <View style={styles.loaderWrap}>
          <LottieLoader size={44} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(product: SubcategoryProduct, i: number) => `${product.id || product.handle || product.name}-${i}`}
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentSolid}
              colors={[colors.accentSolid]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              <Animated.FlatList
                data={FLASH_DISCOUNTS}
                horizontal
                keyExtractor={(item: number, i: number) => `${item}-${i}`}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FLASH_SNAP}
                decelerationRate="fast"
                style={styles.flashScroll}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: flashScrollX } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
                renderItem={({ item: discount, index }: { item: number; index: number }) => {
                  const inputRange = [(index - 1) * FLASH_SNAP, index * FLASH_SNAP, (index + 1) * FLASH_SNAP];
                  const scale = flashScrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
                  const opacity = flashScrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
                  const saleTag = CATEGORY_SALE_TAGS[activeCategory] || 'shopping';
                  const imageLock = activeCategory.length * 15 + index;

                  return (
                    <Animated.View style={[styles.flashSale, { width: FLASH_WIDTH, transform: [{ scale }], opacity }]}>
                      <Image
                        source={{ uri: loremflickrUri(saleTag, imageLock) }}
                        style={styles.flashImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      <LinearGradient colors={['transparent', colors.navy]} locations={[0.3, 1]} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.flashTextWrap}>
                        <Text style={styles.flashSaleEyebrow}>FLASH SALE</Text>
                        <Text style={styles.flashSaleHeadline}>
                          Up to {discount}% off {categoryLabel} today
                        </Text>
                      </View>
                    </Animated.View>
                  );
                }}
              />

              <View style={styles.popularHeaderRow}>
                <Text style={styles.popularHeading}>Popular in {categoryLabel}</Text>
                {(filter.sort !== 'relevance' || filter.stores.length > 0) && (
                  <TouchableOpacity onPress={() => setFilter({ sort: 'relevance', stores: [] })}>
                    <Text style={styles.clearFilter}>Clear filter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.accentSolid} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products match this filter.</Text>
          }
          renderItem={({ item: product, index: i }: { item: SubcategoryProduct; index: number }) => (
            <TouchableOpacity
              key={`${product.handle || product.name}-${i}`}
              style={styles.productCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ProductDetail', {
                  id: product.id,
                  handle: product.handle,
                  url: product.url,
                  productName: product.name,
                  currentPrice: product.price,
                  imageUrl: product.imageUrl,
                  store: product.store,
                })
              }
            >
              <View style={styles.productImageWrap}>
                <Image
                  source={{ uri: product.imageUrl || loremflickrUri(product.pictureTag || 'product', i + 1) }}
                  style={styles.productImage}
                  contentFit="contain"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.productPrice}>{product.price}</Text>

              <View style={styles.badgeRow}>
                {product.hasComparison ? (
                  <View style={styles.compareBadge}>
                    <Text style={styles.compareBadgeText}>2+ stores</Text>
                  </View>
                ) : null}
                {product.hasPriceDrop ? (
                  <View style={styles.priceDropBadge}>
                    <Text style={styles.priceDropBadgeText}>📉 Price Drop</Text>
                  </View>
                ) : null}
                {product.store ? (
                  <View
                    style={[
                      styles.storeBadge,
                      product.store.toLowerCase() === 'daraz'
                        ? { backgroundColor: '#FFF0E6' }
                        : product.store.toLowerCase() === 'telemart'
                        ? { backgroundColor: '#EAF4EF' }
                        : product.store.toLowerCase() === 'mega.pk'
                        ? { backgroundColor: '#E7EEFC' }
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.storeBadgeText,
                        product.store.toLowerCase() === 'daraz'
                          ? { color: '#F57224' }
                          : product.store.toLowerCase() === 'telemart'
                          ? { color: '#1D9A7C' }
                          : product.store.toLowerCase() === 'mega.pk'
                          ? { color: '#2F6FB0' }
                          : null,
                      ]}
                    >
                      {product.store}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <FilterSheet
        visible={filterVisible}
        value={filter}
        onChange={setFilter}
        onClose={() => setFilterVisible(false)}
      />
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    color: colors.onDarkPrimary,
  },
  favButton: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.medium,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabScroll: { marginBottom: 10, flexGrow: 0 },
  tabScrollContent: { paddingHorizontal: 16 },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tabPillActive: { backgroundColor: colors.accentSolid, borderColor: colors.accentSolid },
  tabLabel: { fontSize: 13, fontFamily: fonts.label, color: colors.textSecondary },
  tabLabelActive: { color: colors.onDarkPrimary },

  subScroll: { marginBottom: 14, flexGrow: 0 },
  subScrollContent: { paddingHorizontal: 16, gap: 16 },
  subItem: { alignItems: 'center', width: 64 },
  subIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subIconActive: { borderColor: colors.accentSolid },
  subLabel: { fontSize: 10.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' },
  subLabelActive: { color: colors.textPrimary, fontFamily: fonts.label },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 32 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
  footerLoader: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center', width: '100%' },

  flashScroll: { marginBottom: 18, flexGrow: 0 },
  flashSale: { borderRadius: radii.medium, marginRight: 10, overflow: 'hidden', height: 110 },
  flashImage: { ...StyleSheet.absoluteFillObject },
  flashTextWrap: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  flashSaleEyebrow: { fontSize: 11, fontFamily: fonts.button, color: colors.accentMango, letterSpacing: 1, marginBottom: 4 },
  flashSaleHeadline: { fontSize: 14, fontFamily: fonts.label, color: colors.onDarkPrimary },

  popularHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  popularHeading: { fontSize: 18, fontFamily: fonts.headlineBold, color: colors.textPrimary },
  clearFilter: { fontSize: 12, fontFamily: fonts.button, color: colors.accentSolid },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadows.card,
  },
  productImageWrap: {
    height: 110,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%' },
  productName: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 3 },
  productPrice: { fontSize: 15, fontFamily: fonts.monoEmphasis, color: colors.textPrimary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  compareBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F9F0',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: radii.small,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compareBadgeText: { fontSize: 10, fontFamily: fonts.label, color: '#059669' },
  priceDropBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: radii.small,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceDropBadgeText: { fontSize: 10, fontFamily: fonts.label, color: '#DC2626' },
  storeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentTint,
    borderRadius: radii.small,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  storeBadgeText: { fontSize: 10, fontFamily: fonts.label, color: colors.accentSolid },
  emptyText: { fontSize: 13, fontFamily: fonts.body, color: colors.textTertiary, paddingVertical: 24, textAlign: 'center', width: '100%' },
});