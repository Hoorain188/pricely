import React, { useRef, useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Search,
  Heart,
  ArrowLeft,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLASH_WIDTH = SCREEN_WIDTH - 32 - 40;
const FLASH_SNAP = FLASH_WIDTH + 10;
const SIDEBAR_WIDTH = 72;
const GRID_GAP = 12;
const CONTENT_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - SIDEBAR_WIDTH - (CONTENT_PADDING * 2) - GRID_GAP) / 2;

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
      return Palette;
    case 'haircare':
    case 'scissors':
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
    case 'belts':
    case 'leatherbelt':
    case 'package':
    default:
      return Package;
  }
}

const PRODUCT_TINTS = ['#E4F0E9', '#E8EEFC', '#EAEAEA', '#F5E9D6', '#EEE6F5', '#FDE8E8'];
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
  const flashScrollX = useRef(new Animated.Value(0)).current;

  // Update activeCategory if route.params changes
  useEffect(() => {
    if (route.params?.categoryKey) {
      setActiveCategory(route.params.categoryKey);
    }
  }, [route.params?.categoryKey]);

  // Handle active subcategory fallback reactive to loaded subcategories
  useEffect(() => {
    if (subcategories.length > 0) {
      if (!activeSubcategory || !subcategories.some((s) => s.key === activeSubcategory)) {
        setActiveSubcategory(subcategories[0].key);
      }
    }
  }, [subcategories, activeSubcategory]);

  const activeSub = subcategories.find((s) => s.key === activeSubcategory) ?? subcategories[0];

  const selectCategory = (key: string) => {
    setActiveCategory(key);
  };

  const categoryLabel =
    categories.find((c) => c.key === activeCategory)?.label ?? activeCategory;

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={colors.onDarkPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryLabel}</Text>
        <TouchableOpacity style={styles.favButton} activeOpacity={0.8}>
          <Heart size={20} color={colors.onDarkPrimary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search products or stores"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
          />
        </View>
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
                onPress={() => selectCategory(cat.key)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Sidebar + content */}
      <View style={styles.body}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accentSolid} />
          </View>
        ) : (
          <>
            <View style={styles.sidebarContainer}>
              <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
                {subcategories.map((sub: Subcategory, index: number) => {
                  const active = sub.key === activeSubcategory;
                  const badgeColor = colors.categoryPalette[index % colors.categoryPalette.length];
                  const SubIcon = getIconForTag(sub.imageTag);
                  return (
                    <TouchableOpacity
                      key={sub.key}
                      style={[styles.subItem, active && styles.subItemActive]}
                      activeOpacity={0.8}
                      onPress={() => setActiveSubcategory(sub.key)}
                    >
                      {active && <View style={styles.subActiveBar} />}
                      <View style={[styles.subIcon, { backgroundColor: badgeColor }]}>
                        <SubIcon size={16} color={colors.onDarkPrimary} strokeWidth={2} />
                      </View>
                      <Text style={[styles.subLabel, active && styles.subLabelActive]} numberOfLines={2}>
                        {sub.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
            >
              {/* Flash sale carousel */}
              <Animated.FlatList
                data={FLASH_DISCOUNTS}
                horizontal
                keyExtractor={(item: number, i: number) => `${item}-${i}`}
                showsHorizontalScrollIndicator={false}
                snapToInterval={FLASH_SNAP}
                decelerationRate="fast"
                style={styles.flashScroll}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: flashScrollX } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                renderItem={({ item: discount, index }: { item: number; index: number }) => {
                  const inputRange = [
                    (index - 1) * FLASH_SNAP,
                    index * FLASH_SNAP,
                    (index + 1) * FLASH_SNAP,
                  ];
                  const scale = flashScrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
                  const opacity = flashScrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
                  const saleTag = CATEGORY_SALE_TAGS[activeCategory] || 'shopping';
                  const imageLock = (activeCategory.length) * 15 + index;

                  return (
                    <Animated.View
                      style={[styles.flashSale, { width: FLASH_WIDTH, transform: [{ scale }], opacity }]}
                    >
                      <Image
                        source={{ uri: loremflickrUri(saleTag, imageLock) }}
                        style={styles.flashImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', colors.navy]}
                        locations={[0.3, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
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

              <Text style={styles.popularHeading}>Popular in {activeSub?.label}</Text>

              <View style={styles.productGrid}>
                {activeSub?.products.map((product: SubcategoryProduct, i: number) => {
                  return (
                    <TouchableOpacity key={product.name} style={styles.productCard} activeOpacity={0.85}>
                      <View style={[styles.productImageWrap, { backgroundColor: PRODUCT_TINTS[i % PRODUCT_TINTS.length] }]}>
                        <Image
                          source={{ uri: loremflickrUri(product.pictureTag || activeSub?.imageTag || 'product', i + 1) }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}
      </View>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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

  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
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

  body: { flex: 1, flexDirection: 'row' },

  sidebarContainer: { width: SIDEBAR_WIDTH, backgroundColor: colors.accentTint },
  sidebar: { flex: 1 },
  subItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  subItemActive: { backgroundColor: colors.surface },
  subActiveBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accentSolid,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subLabel: { fontSize: 9.5, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' },
  subLabelActive: { color: colors.textPrimary, fontFamily: fonts.label },

  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 32 },

  flashScroll: { marginBottom: 18, flexGrow: 0 },
  flashSale: { borderRadius: radii.medium, marginRight: 10, overflow: 'hidden', height: 100 },
  flashImage: { ...StyleSheet.absoluteFillObject },
  flashTextWrap: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  flashSaleEyebrow: {
    fontSize: 11,
    fontFamily: fonts.button,
    color: colors.accentMango,
    letterSpacing: 1,
    marginBottom: 4,
  },
  flashSaleHeadline: { fontSize: 14, fontFamily: fonts.label, color: colors.onDarkPrimary },

  popularHeading: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
  },

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
    height: 90,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productName: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 3 },
  productPrice: { fontSize: 15, fontFamily: fonts.monoEmphasis, color: colors.textPrimary },
});
