import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, Animated, StyleSheet, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Flame, ChevronRight, ChevronLeft } from 'lucide-react-native';
import LottieHamburger from '../components/LottieHamburger';
import Sidebar from '../components/Sidebar';
import CategoryCarousel from '../components/CategoryCarousel';
import { colors, radii, fonts, shadows } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useCategories, useTrendingSearches, useBestDrops } from '../hooks/useCatalog';
import { dealImageUri, Category, Deal } from '../services/catalogService';

const CATEGORY_BASE_COUNT = 4; // All + 3 always visible; rest reveal on "See more"
const DEALS_COLLAPSED_COUNT = 2;
const DEALS_EXPANDED_COUNT = 4;

// ---- Store partners ------------------------------------------------------
// Logos load live from each store's own domain via a favicon/logo service
// rather than bundling trademarked artwork. Falls back to a letter badge
// automatically if a logo fails to load.
interface Store {
  key: string;
  name: string;
  domain: string;
  fallbackColor: string;
}

const STORES: Store[] = [
  { key: 'daraz', name: 'Daraz', domain: 'daraz.pk', fallbackColor: '#E4326F' },
  { key: 'megapk', name: 'Mega.pk', domain: 'mega.pk', fallbackColor: '#2F6FB0' },
  { key: 'telemart', name: 'Telemart', domain: 'telemart.pk', fallbackColor: '#1D9A7C' },
  { key: 'amazon', name: 'Amazon', domain: 'amazon.com', fallbackColor: '#B7791F' },
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
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { categories } = useCategories();
  const { trending } = useTrendingSearches();
  const { deals } = useBestDrops();

  const [activeCategory, setActiveCategory] = useState('all');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dealsExpanded, setDealsExpanded] = useState(false);

  // Dynamic — comes from whoever is actually signed in, never hardcoded.
  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  // Categories: base set always visible; the rest slide in from the right
  // when "See more" is tapped, and slide back out on "See less".
  const baseCategories = categories.slice(0, CATEGORY_BASE_COUNT);
  const extraCategories = categories.slice(CATEGORY_BASE_COUNT);
  const extraAnim = useRef(new Animated.Value(0)).current;

  const toggleCategories = () => {
    const next = !categoriesExpanded;
    setCategoriesExpanded(next);
    Animated.timing(extraAnim, {
      toValue: next ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const extraTranslateX = extraAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const dealsCount = dealsExpanded ? DEALS_EXPANDED_COUNT : DEALS_COLLAPSED_COUNT;
  const visibleDeals = deals.slice(0, dealsCount);

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Assalam-o-Alaikum</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>

            <TouchableOpacity style={styles.menuButton} activeOpacity={0.8} onPress={() => setMenuOpen((o) => !o)}>
              <LottieHamburger isOpen={menuOpen} size={22} />
            </TouchableOpacity>
          </View>

          {/* Category image carousel — replaces the old search card. Same
              search field as before, now living inside the carousel's
              pinned top panel; images/theming below match the app.
              Tapping "Explore" on any card navigates to CategoryScreen. */}
          <CategoryCarousel
            categories={categories.filter((c) => c.key !== 'all')}
            storeCount={STORES.length}
            onExplore={(key: string) => navigation.navigate('Category', { categoryKey: key })}
            onSearchSubmit={(query: string) => {
              navigation.navigate('Search', { query });
            }}
          />

          {/* Shop by store — moved above categories */}
          <Text style={styles.sectionTitle}>Shop by store</Text>
          <View style={styles.storeRow}>
            {STORES.map((store) => (
              <TouchableOpacity key={store.key} style={styles.storeItem} activeOpacity={0.8}>
                <StoreLogo store={store} />
                <Text style={styles.storeName}>{store.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category pills — base set + animated "see more" reveal.
              Tapping any real category navigates to CategoryScreen; "All"
              just filters this screen's own state. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {baseCategories.map((cat: Category) => {
              const active = cat.key === activeCategory;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => goToCategory(cat.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}

            {categoriesExpanded && (
              <Animated.View style={[styles.extraCategoriesRow, { opacity: extraAnim, transform: [{ translateX: extraTranslateX }] }]}>
                {extraCategories.map((cat: Category) => {
                  const active = cat.key === activeCategory;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryPill, active && styles.categoryPillActive]}
                      onPress={() => goToCategory(cat.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}

            {extraCategories.length > 0 && (
              <TouchableOpacity style={styles.categoryTogglePill} onPress={toggleCategories} activeOpacity={0.85}>
                <Text style={styles.categoryToggleLabel}>{categoriesExpanded ? 'Less' : 'More'}</Text>
                {categoriesExpanded ? (
                  <ChevronLeft size={14} color={colors.accentSolid} />
                ) : (
                  <ChevronRight size={14} color={colors.accentSolid} />
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Trending searches — 2 rows, scrolls sideways. flexDirection
              'column' + flexWrap inside a fixed-height horizontal
              ScrollView is what makes RN wrap items into a second row
              instead of a single long line. */}
          <Text style={styles.trendingSectionTitle}>Trending searches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingScroll}>
            <View style={styles.trendingGrid}>
              {trending.map((term: string) => (
                <TouchableOpacity key={term} style={styles.trendingChip} activeOpacity={0.8}>
                  <Flame size={14} color={colors.adminAccent} />
                  <Text style={styles.trendingLabel}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Today's best drops */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's best drops</Text>
            {deals.length > DEALS_COLLAPSED_COUNT && (
              <TouchableOpacity onPress={() => setDealsExpanded((e) => !e)}>
                <Text style={styles.seeAll}>{dealsExpanded ? 'See less' : 'See more'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.dealsGrid}>
            {visibleDeals.map((deal: Deal) => (
              <TouchableOpacity
                key={deal.id}
                style={styles.dealCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ProductDetail', { productName: deal.name, currentPrice: deal.price })}
              >
                <Image source={{ uri: dealImageUri(deal.imageSeed) }} style={styles.dealImage} resizeMode="cover" />
                <Text style={styles.dealName} numberOfLines={1}>
                  {deal.name}
                </Text>
                <Text style={styles.dealPrice}>{deal.price}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    ▼ {deal.discount} · {deal.store}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
          else if (['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Appliances', 'Mobiles', 'Categories'].includes(dest)) {
            const key = dest === 'Mobiles' ? 'electronics' : dest === 'Home & Living' ? 'home' : dest.toLowerCase();
            navigation.navigate('Category', { categoryKey: key });
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
  trendingLabel: { fontSize: 12, fontFamily: fonts.label, color: colors.textPrimary },

  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dealCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    ...shadows.card,
  },
  dealImage: { width: '100%', height: 78, borderRadius: radii.small, backgroundColor: colors.accentTint, marginBottom: 8 },
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