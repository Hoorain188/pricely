import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Watch,
  BatteryCharging,
  Cable,
  Monitor,
  Camera,
  Tv,
  Gamepad2,
  Headphones,
  Shirt,
  ShoppingBag,
  Footprints,
  Briefcase,
  Gem,
  Baby,
  Droplet,
  Palette,
  Scissors,
  SprayCan,
  Sparkles,
  Sofa,
  UtensilsCrossed,
  BedDouble,
  Lamp,
  Archive,
  Refrigerator,
  Wind,
  Fan,
  Flame,
  Plug,
  Glasses,
  Wallet,
  Package,
  LucideIcon,
} from 'lucide-react-native';
import { colors, gradients, radii, fonts, shadows } from '../theme/colors';
import { useCategories, useSubcategories } from '../hooks/useCatalog';
import { loremflickrUri } from '../components/CategoryCarousel';
import { Subcategory, SubcategoryProduct } from '../services/catalogService';
import LottieBackButton from '../components/Lottiebackbutton';
import LottieToggleIcon from '../components/LottieToggleIcon';
import LottieSearchIcon from '../components/Lottiesearchicon';
import LottieLoader from '../components/Lottieloader';
import FilterSheet, { FilterState, sortProducts } from '../components/Filtersheet';
import heartJson from '../../assets/Lottie/Heart.json';

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
  electronics: 'tech,gadgets',
  fashion: 'clothes,fashion',
  beauty: 'cosmetics,beauty',
  home: 'interior,decor',
  appliances: 'kitchenware,appliances',
  watches: 'wristwatch,luxury',
};

export default function CategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory: string = route.params?.categoryKey || 'electronics';

  const { categories } = useCategories();
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const { subcategories, loading } = useSubcategories(activeCategory);
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<FilterState>({ sort: 'relevance', stores: [] });
  const flashScrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (route.params?.categoryKey) setActiveCategory(route.params.categoryKey);
  }, [route.params?.categoryKey]);

  useEffect(() => {
    if (subcategories.length > 0) {
      if (!activeSubcategory || !subcategories.some((s) => s.key === activeSubcategory)) {
        setActiveSubcategory(subcategories[0].key);
      }
    }
  }, [subcategories, activeSubcategory]);

  const activeSub = subcategories.find((s) => s.key === activeSubcategory) ?? subcategories[0];
  const categoryLabel = categories.find((c) => c.key === activeCategory)?.label ?? activeCategory;

  const filteredProducts = useMemo(() => {
    if (!activeSub) return [];
    let list = activeSub.products;
    if (filter.stores.length > 0) {
      const demoStores = ['Daraz', 'Telemart', 'Mega.pk', 'Amazon'];
      list = list.filter((_, i) => filter.stores.includes(demoStores[i % demoStores.length]));
    }
    return sortProducts(list, filter.sort);
  }, [activeSub, filter]);

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
        <LottieBackButton onPress={() => navigation.goBack()} size={30} />
        <Text style={styles.headerTitle}>{categoryLabel}</Text>
        <TouchableOpacity style={styles.favButton} activeOpacity={0.8} onPress={() => setFavorite((f) => !f)}>
          <LottieToggleIcon
            source={heartJson}
            active={favorite}
            size={22}
            colorFilters={[
              { keypath: 'heart', color: colors.onDarkPrimary },
              { keypath: 'heart Fill', color: colors.onDarkPrimary },
            ]}
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <LottieSearchIcon active={searchValue.length > 0} size={18} color={colors.textTertiary} />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search products or stores"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8} onPress={() => setFilterVisible(true)}>
          <SlidersHorizontal size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Top-level category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabScrollContent}
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

      {/* Subcategories */}
      {!loading && subcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subScroll}
          contentContainerStyle={styles.subScrollContent}
        >
          {subcategories.map((sub: Subcategory, index: number) => {
            const active = sub.key === activeSubcategory;
            const badgeColor = colors.categoryPalette[index % colors.categoryPalette.length];
            const SubIcon = getIconForTag(sub.imageTag);
            return (
              <TouchableOpacity
                key={sub.key}
                style={styles.subItem}
                activeOpacity={0.8}
                onPress={() => setActiveSubcategory(sub.key)}
              >
                <View style={[styles.subIcon, { backgroundColor: badgeColor }, active && styles.subIconActive]}>
                  <SubIcon size={18} color={colors.onDarkPrimary} strokeWidth={2} />
                </View>
                <Text style={[styles.subLabel, active && styles.subLabelActive]} numberOfLines={1}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <LottieLoader size={44} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
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
                  <Image source={{ uri: loremflickrUri(saleTag, imageLock) }} style={styles.flashImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', colors.navy]} locations={[0.3, 1]} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.flashTextWrap}>
                    <Text style={styles.flashSaleEyebrow}>FLASH SALE</Text>
                    <Text style={styles.flashSaleHeadline}>
                      Up to {discount}% off {activeSub?.label} today
                    </Text>
                  </View>
                </Animated.View>
              );
            }}
          />

          <View style={styles.popularHeaderRow}>
            <Text style={styles.popularHeading}>Popular in {activeSub?.label}</Text>
            {(filter.sort !== 'relevance' || filter.stores.length > 0) && (
              <TouchableOpacity onPress={() => setFilter({ sort: 'relevance', stores: [] })}>
                <Text style={styles.clearFilter}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.productGrid}>
            {filteredProducts.map((product: SubcategoryProduct, i: number) => (
              <TouchableOpacity
                key={product.name}
                style={styles.productCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ProductDetail', { productName: product.name, currentPrice: product.price })}
              >
                <View style={styles.productImageWrap}>
                  <Image
                    source={{ uri: loremflickrUri(product.pictureTag || activeSub?.imageTag || 'product', i + 1) }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </TouchableOpacity>
            ))}
            {filteredProducts.length === 0 && (
              <Text style={styles.emptyText}>No products match this filter.</Text>
            )}
          </View>
        </ScrollView>
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
  emptyText: { fontSize: 13, fontFamily: fonts.body, color: colors.textTertiary, paddingVertical: 24, textAlign: 'center', width: '100%' },
});