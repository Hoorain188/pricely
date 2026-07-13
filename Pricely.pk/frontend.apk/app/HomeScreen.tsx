import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, Animated, StyleSheet, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Flame, ChevronRight, ChevronLeft } from 'lucide-react-native';
import LottieHamburger from '../components/LottieHamburger';
import Sidebar from '../components/Sidebar';
import { colors, gradients, radii, fonts, shadows } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import { useCategories, useTrendingSearches, useBestDrops } from '../hooks/useCatalog';
import { dealImageUri, Category, Deal } from '../services/catalogService';

// Rotating search placeholder examples, pulled from different categories
// so it doesn't look like it's only about phones. (Static copy text, not
// catalog data, so it stays here rather than in the data layer.)
const SEARCH_EXAMPLES = [
  '"Redmi Note 13"...',
  '"Air Fryer 5L"...',
  '"Nike Air Max 90"...',
  '"PS5 Slim"...',
  '"Samsung 55" 4K TV"...',
];

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
  const { user } = useAuthStore();
  const { categories } = useCategories();
  const { trending } = useTrendingSearches();
  const { deals } = useBestDrops();

  const [activeCategory, setActiveCategory] = useState('all');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dealsExpanded, setDealsExpanded] = useState(false);

  // Dynamic — comes from whoever is actually signed in, never hardcoded.
  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  // Rotating placeholder — fades out, swaps text, fades back in, every 5s.
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(placeholderAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setPlaceholderIndex((i) => (i + 1) % SEARCH_EXAMPLES.length);
        Animated.timing(placeholderAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

          {/* Search + stats card — 135deg green-to-blue per the design
              kit's `gradients.duo` spec, with a soft glow circle for depth
              matching the reference. */}
          <LinearGradient colors={gradients.duo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.searchCard}>
            <View style={styles.searchCardGlow} pointerEvents="none" />
            <Text style={styles.searchEyebrow}>SEARCH ACROSS {STORES.length} STORES</Text>

            <View style={styles.searchBar}>
              <Search size={18} color="rgba(255,255,255,0.85)" />
              <View style={styles.searchInputWrap}>
                <TextInput value={searchValue} onChangeText={setSearchValue} style={styles.searchInput} />
                {searchValue.length === 0 && (
                  <Animated.Text style={[styles.searchPlaceholder, { opacity: placeholderAnim }]} pointerEvents="none">
                    {SEARCH_EXAMPLES[placeholderIndex]}
                  </Animated.Text>
                )}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statValue}>3,140+</Text>
                <Text style={styles.statLabel}>deals tracked</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statValue}>Rs 2.1M</Text>
                <Text style={styles.statLabel}>saved this week</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Category pills — base set + animated "see more" reveal */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {baseCategories.map((cat: Category) => {
              const active = cat.key === activeCategory;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => setActiveCategory(cat.key)}
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
                      onPress={() => setActiveCategory(cat.key)}
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

          {/* Trending searches */}
          <Text style={styles.trendingSectionTitle}>Trending searches</Text>
          <View style={styles.trendingRow}>
            {trending.map((term: string) => (
              <TouchableOpacity key={term} style={styles.trendingChip} activeOpacity={0.8}>
                <Flame size={14} color={colors.adminAccent} />
                <Text style={styles.trendingLabel}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
              <View key={deal.id} style={styles.dealCard}>
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
              </View>
            ))}
          </View>

          {/* Shop by store */}
          <Text style={styles.sectionTitle}>Shop by store</Text>
          <View style={styles.storeRow}>
            {STORES.map((store) => (
              <TouchableOpacity key={store.key} style={styles.storeItem} activeOpacity={0.8}>
                <StoreLogo store={store} />
                <Text style={styles.storeName}>{store.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(destination: string) => {
          // TODO: wire this to real navigation once the other screens exist
          console.log('Navigate to:', destination);
        }}
        onLogout={() => {
          // TODO: call your real sign-out (clear token via useAuthStore, etc.)
          setMenuOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: fonts.body, color: colors.textTertiary },
  name: { fontSize: 24, fontFamily: fonts.headline, color: colors.textPrimary, marginTop: 2 },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radii.small,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchCard: { borderRadius: radii.large, padding: 20, marginBottom: 20, overflow: 'hidden', ...shadows.card },
  searchCardGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -60,
    right: -40,
  },
  searchEyebrow: { fontSize: 11, fontFamily: fonts.button, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 18,
  },
  searchInputWrap: { flex: 1, justifyContent: 'center' },
  searchInput: { fontFamily: fonts.body, fontSize: 15, color: colors.onDarkPrimary, padding: 0 },
  searchPlaceholder: {
    position: 'absolute',
    left: 0,
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statValue: { fontSize: 18, fontFamily: fonts.monoEmphasis, color: colors.accentMango },
  statLabel: { fontSize: 12, fontFamily: fonts.body, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)' },

  categoryScroll: { marginBottom: 24 },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  categoryPillActive: { backgroundColor: colors.accentBlueTint, borderColor: colors.adminAccent },
  categoryLabel: { fontSize: 13, fontFamily: fonts.label, color: colors.textSecondary },
  categoryLabelActive: { color: colors.adminAccent },
  extraCategoriesRow: { flexDirection: 'row' },
  categoryTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    marginRight: 10,
  },
  categoryToggleLabel: { fontSize: 13, fontFamily: fonts.button, color: colors.accentSolid },

  sectionTitle: { fontSize: 19, fontFamily: fonts.headline, color: colors.textPrimary, marginBottom: 12 },
  trendingSectionTitle: {
    fontSize: 20,
    fontFamily: fonts.button, // Inter Bold — noticeably bolder than the Fraunces section titles
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  seeAll: { fontSize: 13, fontFamily: fonts.button, color: colors.accentSolid },

  trendingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentTint,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  trendingLabel: { fontSize: 13, fontFamily: fonts.label, color: colors.textPrimary },

  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  dealCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadows.card,
  },
  dealImage: { width: '100%', height: 100, borderRadius: radii.small, backgroundColor: colors.accentTint, marginBottom: 10 },
  dealName: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 4 },
  dealPrice: { fontSize: 16, fontFamily: fonts.monoEmphasis, color: colors.textPrimary, marginBottom: 8 },
  discountBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentMango, borderRadius: radii.small, paddingHorizontal: 8, paddingVertical: 4 },
  discountText: { fontSize: 11, fontFamily: fonts.button, color: colors.onDarkPrimary },

  storeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  storeItem: { alignItems: 'center', gap: 8 },
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