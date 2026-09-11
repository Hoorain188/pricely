import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BackHandler, View, Text, ScrollView, TextInput, TouchableOpacity, Animated, StyleSheet, Easing, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Flame, Heart } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieHamburger from '../components/LottieHamburger';
import Sidebar from '../components/Sidebar';
import CategoryCarousel, { getValidProductImage } from '../components/CategoryCarousel';
import { colors, radii, fonts, shadows } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useUserStore } from '../context/UserStore';
import { useCategories, useTrendingSearches } from '../hooks/useCatalog';
import { Category, getCategoryKeyFromLabel, getStoreBadgeStyle } from '../services/catalogService';
import { fetchBrowseProducts, formatPrice, ApiProduct } from '../services/api';

interface Store {
  key: string;
  name: string;
  domain: string;
  fallbackColor: string;
}

const STORES: Store[] = [
  { key: 'daraz', name: 'Daraz', domain: 'daraz.pk', fallbackColor: '#F57224' },
  { key: 'megapk', name: 'Mega.pk', domain: 'mega.pk', fallbackColor: '#2F6FB0' },
  { key: 'telemart', name: 'Telemart', domain: 'telemart.pk', fallbackColor: '#1D9A7C' },
  { key: 'amazon', name: 'Amazon', domain: 'amazon.com', fallbackColor: '#B7791F' },
];

const ALL_CAT_KEYS = [
  'mobiles_tablets',
  'laptops_computers',
  'tv_entertainment',
  'home_appliances',
  'kitchen_appliances',
  'cameras',
  'audio',
  'wearables',
  'gaming',
  'accessories'
];

const logoUri = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

function StoreLogo({ store }: { store: Store }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.storeBadge, { backgroundColor: store.fallbackColor }]}>
        <Text style={styles.storeInitial}>{store.name[0]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.storeBadge}>
      <Image
        source={{ uri: logoUri(store.domain) }}
        style={styles.storeLogoImage}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { toggleFavorite, isFavorited } = useUserStore();
  const { categories } = useCategories();
  const { trending } = useTrendingSearches();

  const [activeCategory, setActiveCategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(() => Math.floor(Math.random() * 1000000));

  const [dropProducts, setDropProducts] = useState<any[]>([]);
  const [dropPage, setDropPage] = useState(1);
  const [dropLoading, setDropLoading] = useState(true);
  const [dropLoadingMore, setDropLoadingMore] = useState(false);
  const [dropHasMore, setDropHasMore] = useState(true);

  useEffect(() => {
    const onBackPress = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [menuOpen]);

  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  const categoryScrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const animIntervalRef = useRef<any>(null);
  const resumeTimerRef = useRef<any>(null);
  const isInteractingRef = useRef(false);

  const startAutoScroll = useCallback(() => {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    animIntervalRef.current = setInterval(() => {
      if (isInteractingRef.current) return;
      scrollOffsetRef.current += 2.6;
      if (scrollOffsetRef.current > 850) {
        scrollOffsetRef.current = 0;
      }
      categoryScrollRef.current?.scrollTo({ x: scrollOffsetRef.current, animated: true });
    }, 25);
  }, []);

  const handleCategoryTouch = () => {
    isInteractingRef.current = true;
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
      startAutoScroll();
    }, 3000);
  };

  useEffect(() => {
    if (!categories || categories.length === 0) return;
    const startTimer = setTimeout(() => {
      startAutoScroll();
    }, 1000);

    return () => {
      clearTimeout(startTimer);
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [categories, startAutoScroll]);

  useEffect(() => {
    let alive = true;
    setDropLoading(true);
    setDropPage(1);
    setDropHasMore(true);

    Promise.all(
      ALL_CAT_KEYS.map((catKey) => fetchBrowseProducts(catKey, undefined, refreshSeed, 1, 6))
    )
      .then((responses) => {
        if (!alive) return;
        const arrays = responses.map((r) => r?.results || []);
        const interleaved: any[] = [];
        const maxLen = Math.max(...arrays.map((a) => a.length), 0);

        for (let i = 0; i < maxLen; i++) {
          for (let j = 0; j < arrays.length; j++) {
            const item = arrays[j][i];
            if (item) {
              interleaved.push({
                id: item.id,
                name: item.title,
                price: formatPrice(item.price),
                imageUrl: item.imageUrl || undefined,
                handle: item.handle,
                store: item.store || 'Pricely',
                url: item.url,
                categoryKey: ALL_CAT_KEYS[j],
                hasComparison: item.hasComparison,
                hasPriceDrop: item.hasPriceDrop,
              });
            }
          }
        }
        // Prioritize products available on multiple stores (hasComparison) and/or with price drops
        interleaved.sort((a, b) => {
          const scoreA = (a.hasComparison ? 2 : 0) + (a.hasPriceDrop ? 1 : 0);
          const scoreB = (b.hasComparison ? 2 : 0) + (b.hasPriceDrop ? 1 : 0);
          return scoreB - scoreA;
        });
        setDropProducts(interleaved);
        setDropLoading(false);
      })
      .catch(() => {
        if (alive) setDropLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshSeed]);

  const handleLoadMore = () => {
    if (!dropHasMore || dropLoadingMore || dropLoading || refreshing) return;
    setDropLoadingMore(true);
    const nextPage = dropPage + 1;

    Promise.all(
      ALL_CAT_KEYS.map((catKey) => fetchBrowseProducts(catKey, undefined, refreshSeed, nextPage, 6))
    )
      .then((responses) => {
        const arrays = responses.map((r) => r?.results || []);
        const interleaved: any[] = [];
        const maxLen = Math.max(...arrays.map((a) => a.length), 0);

        for (let i = 0; i < maxLen; i++) {
          for (let j = 0; j < arrays.length; j++) {
            const item = arrays[j][i];
            if (item) {
              interleaved.push({
                id: item.id,
                name: item.title,
                price: formatPrice(item.price),
                imageUrl: item.imageUrl || undefined,
                handle: item.handle,
                store: item.store || 'Pricely',
                url: item.url,
                categoryKey: ALL_CAT_KEYS[j],
                hasComparison: item.hasComparison,
              });
            }
          }
        }

        if (interleaved.length > 0) {
          setDropProducts((prev) => {
            const existing = new Set(prev.map((p) => `${p.id || p.handle || p.name}`));
            const uniqueNew = interleaved.filter((p) => !existing.has(`${p.id || p.handle || p.name}`));
            return [...prev, ...uniqueNew];
          });
          setDropPage(nextPage);
        } else {
          setDropHasMore(false);
        }
      })
      .catch(() => setDropHasMore(false))
      .finally(() => setDropLoadingMore(false));
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshSeed(Math.floor(Math.random() * 1000000));
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const goToCategory = (key: string) => {
    if (key !== 'all') {
      navigation.navigate('Category', { categoryKey: key });
    } else {
      setActiveCategory(key);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        <FlatList
          key={refreshSeed}
          data={dropProducts}
          numColumns={2}
          keyExtractor={(item: any, idx: number) => `${item.id || item.handle || idx}-${idx}`}
          style={styles.content}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentSolid}
              colors={[colors.accentSolid]}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.greeting}>Assalam-o-Alaikum</Text>
                  <Text style={styles.name}>{firstName}</Text>
                </View>

                <TouchableOpacity style={styles.menuButton} activeOpacity={0.8} onPress={() => setMenuOpen((o) => !o)}>
                  <LottieHamburger isOpen={menuOpen} size={22} />
                </TouchableOpacity>
              </View>

              <CategoryCarousel
                categories={categories.filter((c) => c.key !== 'all')}
                storeCount={STORES.length}
                onExplore={(key: string) => navigation.navigate('Category', { categoryKey: key })}
                onSearchSubmit={(query: string) => {
                  navigation.navigate('Search', { query });
                }}
              />

              <Text style={styles.sectionTitle}>Shop by store</Text>
              <View style={styles.storeRow}>
                {STORES.map((store) => (
                  <TouchableOpacity
                    key={store.key}
                    style={styles.storeItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (store.key === 'telemart') {
                        navigation.navigate('Category', { categoryKey: 'mobiles_tablets', storeFilter: 'Telemart' });
                      } else if (store.key === 'megapk') {
                        navigation.navigate('Category', { categoryKey: 'mobiles_tablets', storeFilter: 'Mega.pk' });
                      } else if (store.key === 'daraz') {
                        navigation.navigate('Category', { categoryKey: 'mobiles_tablets', storeFilter: 'Daraz' });
                      } else {
                        navigation.navigate('Search', { storeFilter: store.name });
                      }
                    }}
                  >
                    <StoreLogo store={store} />
                    <Text style={styles.storeName}>{store.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Categories</Text>

              <ScrollView
                ref={categoryScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                onScrollBeginDrag={handleCategoryTouch}
                onTouchStart={handleCategoryTouch}
              >
                {categories.map((cat: Category, idx: number) => {
                  const active = cat.key === activeCategory;
                  return (
                    <TouchableOpacity
                      key={`${cat.key || idx}-${idx}`}
                      style={[styles.categoryPill, active && styles.categoryPillActive]}
                      onPress={() => goToCategory(cat.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionTitle}>Trending Searches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
                <View style={styles.trendingGrid}>
                  {trending.map((t: any, idx: number) => {
                    const termStr = typeof t === 'string' ? t : t.term || `trending-${idx}`;
                    const countVal = typeof t === 'object' && t.count ? t.count : null;
                    return (
                      <TouchableOpacity
                        key={`${termStr}-${idx}`}
                        style={styles.trendingChip}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Search', { query: termStr })}
                      >
                        <Flame size={13} color={colors.accentSolid} style={{ marginRight: 4 }} />
                        <Text style={styles.categoryLabel}>{termStr}</Text>
                        {countVal !== null && <Text style={styles.trendingCount}>({countVal})</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ marginBottom: 12, marginTop: 10 }}>
                <Text style={styles.sectionTitle}>Today's best drops</Text>
              </View>
            </>
          }
          ListFooterComponent={
            dropLoadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.accentSolid} />
              </View>
            ) : null
          }
          renderItem={({ item: deal, index: idx }: { item: any; index: number }) => {
            const imgUri = getValidProductImage(deal.imageUrl, deal.categoryKey, deal.name);
            const favorited = isFavorited(deal.name);

            return (
              <TouchableOpacity
                key={`${deal.id || deal.handle || idx}-${idx}`}
                style={styles.dealCardGrid}
                activeOpacity={0.88}
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    id: deal.id,
                    handle: deal.handle,
                    productName: deal.name,
                    currentPrice: deal.price,
                    imageUrl: imgUri,
                    store: deal.store,
                    categoryKey: deal.categoryKey,
                    url: deal.url,
                  })
                }
              >
                <View style={styles.dealImageWrap}>
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.dealImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                  <TouchableOpacity
                    style={styles.favFloatBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      toggleFavorite({
                        name: deal.name,
                        price: deal.price,
                        imageUrl: imgUri,
                        categoryKey: deal.categoryKey,
                        store: deal.store,
                        handle: deal.handle,
                      })
                    }
                  >
                    <Ionicons
                      name={favorited ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favorited ? '#E74C3C' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.dealName} numberOfLines={2}>
                  {deal.name}
                </Text>
                <Text style={styles.dealPrice}>{deal.price}</Text>

                {(() => {
                  const storeMeta = getStoreBadgeStyle(deal.store);
                  return (
                    <View style={[styles.storeTagPill, { backgroundColor: storeMeta.bg, borderColor: storeMeta.border, borderWidth: 1 }]}>
                      <Text style={[styles.storeTagText, { color: storeMeta.color, fontFamily: fonts.button }]}>{deal.store || 'Pricely'}</Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(dest) => {
          if (dest === 'Home') navigation.navigate('Home');
          else if (dest === 'Search') navigation.navigate('Search');
          else if (dest === 'Favorites') navigation.navigate('Favorites');
          else if (dest === 'Price Alerts' || dest === 'Notifications' || dest === 'Alerts') navigation.navigate('Alerts');
          else if (dest === 'Profile' || dest === 'Account') navigation.navigate('Account');
          else if (dest === 'Settings') navigation.navigate('Settings');
          else if (dest === 'Help & Support' || dest === 'HelpSupport' || dest === 'Help') navigation.navigate('HelpSupport');
          else {
            const catKey = getCategoryKeyFromLabel(dest);
            navigation.navigate('Category', { categoryKey: catKey });
          }
        }}
        onLogout={async () => {
          setMenuOpen(false);
          const { useAuthStore } = require('../context/AuthContext');
          await useAuthStore.getState().clearAuth();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 12, fontFamily: fonts.body, color: colors.textTertiary },
  name: { fontSize: 24, fontFamily: fonts.headlineBold, color: colors.textPrimary, marginTop: 1 },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radii.small,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryScroll: { marginBottom: 16 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryPillActive: { backgroundColor: colors.accentBlueTint, borderColor: colors.adminAccent },
  categoryLabel: { fontSize: 12, fontFamily: fonts.label, color: colors.textSecondary },
  categoryLabelActive: { color: colors.adminAccent },
  extraCategoriesRow: { flexDirection: 'row' },
  categoryTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    marginRight: 8,
  },
  categoryToggleLabel: { fontSize: 12, fontFamily: fonts.button, color: colors.accentSolid },

  sectionTitle: { fontSize: 19, fontFamily: fonts.headlineBold, color: colors.textPrimary, marginBottom: 8 },
  trendingSectionTitle: {
    fontSize: 19,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  seeAll: { fontSize: 12, fontFamily: fonts.button, color: colors.accentSolid },

  trendingScroll: { marginBottom: 16 },
  trendingGrid: { flexDirection: 'column', flexWrap: 'wrap', height: 2 * 42 + 8 }, // 2 rows of chips
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentTint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  trendingCount: {
    fontSize: 11,
    fontFamily: fonts.button,
    color: colors.accentSolid,
  },
  trendingLabel: { fontSize: 12, fontFamily: fonts.label, color: colors.textPrimary },

  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dealCardGrid: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadows.card,
  },
  dealImageWrap: {
    width: '100%',
    height: 110,
    borderRadius: radii.small,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  favFloatBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  storeTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF4EF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  storeTagText: {
    fontSize: 10,
    fontFamily: fonts.button,
    color: '#1D9A7C',
  },
  dealCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    ...shadows.card,
  },
  dealImage: { width: '100%', height: '100%' },
  dealName: { fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 3 },
  dealPrice: { fontSize: 15, fontFamily: fonts.monoEmphasis, color: colors.textPrimary, marginBottom: 6 },
  discountBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentMango, borderRadius: radii.small, paddingHorizontal: 7, paddingVertical: 3 },
  discountText: { fontSize: 10, fontFamily: fonts.button, color: colors.onDarkPrimary },

  storeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  storeItem: { alignItems: 'center', gap: 6 },
  storeBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storeLogoImage: { width: '70%', height: '70%' },
  storeInitial: { fontSize: 18, fontFamily: fonts.headline, color: colors.onDarkPrimary },
  storeName: { fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary },
});