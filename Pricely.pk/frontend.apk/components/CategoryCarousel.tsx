import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import LottieSearchIcon from './Lottiesearchicon';
import { colors, gradients, radii, fonts, shadows } from '../theme/colors';
import { Category } from '../services/catalogService';
import { fetchBrowseProducts, ApiProduct } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.68;
const CARD_SPACING = 14;
const SNAP = CARD_WIDTH + CARD_SPACING;
const SIDE_PADDING = 20;

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  mobiles_tablets: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80',
  laptops_computers: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  tv_entertainment: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80',
  home_appliances: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&auto=format&fit=crop&q=80',
  kitchen_appliances: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&auto=format&fit=crop&q=80',
  cameras: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
  audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  wearables: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  gaming: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
  accessories: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
};

export const loremflickrUri = (tag: string, lock: number) => {
    const key = tag.toLowerCase();
    for (const k of Object.keys(CATEGORY_IMAGE_MAP)) {
        if (key.includes(k)) return CATEGORY_IMAGE_MAP[k];
    }
    return CATEGORY_IMAGE_MAP.default;
};

export const categoryImageUri = (key?: string | null) => {
    if (!key) return CATEGORY_IMAGE_MAP.default;
    return CATEGORY_IMAGE_MAP[key] || CATEGORY_IMAGE_MAP.default;
};

export function getValidProductImage(imageUrl?: string | null, categoryKey?: string | null, productName?: string | null): string {
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        return imageUrl;
    }
    return categoryImageUri(categoryKey || productName || 'default');
}

const SEARCH_EXAMPLES = [
    '"Redmi Note 13"...',
    '"Air Fryer 5L"...',
    '"Nike Air Max 90"...',
    '"PS5 Slim"...',
    '"Samsung 55" 4K TV"...',
];

interface CategoryCarouselProps {
    categories: Category[];
    storeCount: number;
    onExplore: (categoryKey: string) => void;
    onSearchSubmit?: (query: string) => void;
}

const _productCache: Record<string, ApiProduct[]> = {};

export default function CategoryCarousel({ categories, storeCount, onExplore, onSearchSubmit }: CategoryCarouselProps) {
    const navigation = useNavigation<any>();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [searchValue, setSearchValue] = useState('');
    const [categoryProducts, setCategoryProducts] = useState<Record<string, ApiProduct[]>>({});
    const [activeIdx, setActiveIdx] = useState(0);

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholderAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!categories || categories.length === 0) return;
        const randomSeed = Math.floor(Math.random() * 100000);
        categories.forEach((cat) => {
            fetchBrowseProducts(cat.key, undefined, randomSeed, 1, 16)
                .then((res) => {
                    if (res.results && res.results.length > 0) {
                        const shuffled = [...res.results].sort(() => Math.random() - 0.5);
                        setCategoryProducts((prev) => ({ ...prev, [cat.key]: shuffled }));
                    }
                })
                .catch(() => {});
        });
    }, [categories]);

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(placeholderAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
                setPlaceholderIndex((i) => (i + 1) % SEARCH_EXAMPLES.length);
                Animated.timing(placeholderAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const activeCategory = categories[activeIdx] || categories[0];

    return (
        <LinearGradient
            colors={gradients.heroCarousel}
            locations={gradients.heroCarouselLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
        >
            {/* Search bar */}
            <View style={styles.searchPanel}>
                <Text style={styles.searchEyebrow}>SEARCH ACROSS {storeCount} STORES</Text>
                <View style={styles.searchBar}>
                    <LottieSearchIcon active={searchValue.length > 0} size={22} color="rgba(255,255,255,0.85)" />
                    <View style={styles.searchInputWrap}>
                        <TextInput
                            value={searchValue}
                            onChangeText={setSearchValue}
                            onSubmitEditing={() => onSearchSubmit?.(searchValue)}
                            style={styles.searchInput}
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            returnKeyType="search"
                        />
                        {searchValue.length === 0 && (
                            <Animated.Text style={[styles.searchPlaceholder, { opacity: placeholderAnim }]} pointerEvents="none">
                                {SEARCH_EXAMPLES[placeholderIndex]}
                            </Animated.Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Top Category Coverflow Cards */}
            <Animated.FlatList
                data={categories}
                horizontal
                keyExtractor={(item: Category) => item.key}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, paddingBottom: 4 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                    listener: (e: any) => {
                        const offsetX = e.nativeEvent.contentOffset.x;
                        const index = Math.min(Math.max(0, Math.round(offsetX / SNAP)), categories.length - 1);
                        if (index !== activeIdx) {
                            setActiveIdx(index);
                        }
                    },
                })}
                scrollEventThrottle={16}
                renderItem={({ item, index }: { item: Category; index: number }) => {
                    const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];
                    const scale = scrollX.interpolate({ inputRange, outputRange: [0.88, 1, 0.88], extrapolate: 'clamp' });
                    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });

                    const isCurrent = index === activeIdx;
                    const fetchedProds = categoryProducts[item.key] || [];
                    const topProductImg = fetchedProds[0]?.imageUrl;
                    const cardImgUri = getValidProductImage(topProductImg, item.key);

                    return (
                        <TouchableOpacity activeOpacity={0.92} onPress={() => {
                            setActiveIdx(index);
                            onExplore(item.key);
                        }}>
                            <Animated.View style={[
                                styles.card,
                                { marginRight: CARD_SPACING, transform: [{ scale }], opacity },
                                isCurrent && styles.activeCardBorder,
                            ]}>
                                <Image
                                    source={{ uri: cardImgUri }}
                                    style={styles.cardImage}
                                    contentFit="cover"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(11,30,61,0.4)', 'rgba(7,18,36,0.92)']}
                                    locations={[0, 0.45, 1]}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.cardContent}>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>CATEGORY</Text>
                                    </View>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{item.label}</Text>
                                    <View style={styles.cardBottomRow}>
                                        <Text style={styles.productCountBadge}>8 Products</Text>
                                        <View style={styles.explorePill}>
                                            <Text style={styles.explorePillText}>Explore →</Text>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>
                        </TouchableOpacity>
                    );
                }}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    hero: {
        borderRadius: radii.large,
        paddingTop: 12,
        paddingBottom: 14,
        marginBottom: 16,
        overflow: 'hidden',
        ...shadows.card,
    },
    searchPanel: {
        marginHorizontal: 14,
        backgroundColor: 'rgba(11,30,61,0.45)',
        borderRadius: radii.medium,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        padding: 12,
        marginBottom: 12,
    },
    searchEyebrow: { fontSize: 10, fontFamily: fonts.button, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginBottom: 8 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: radii.medium,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 14,
        height: 40,
    },
    searchInputWrap: { flex: 1, justifyContent: 'center' },
    searchInput: { fontFamily: fonts.body, fontSize: 14, color: colors.onDarkPrimary, padding: 0 },
    searchPlaceholder: {
        position: 'absolute',
        left: 0,
        fontFamily: fonts.body,
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },

    card: {
        width: CARD_WIDTH,
        height: 140,
        borderRadius: radii.medium,
        overflow: 'hidden',
        backgroundColor: colors.navy,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    activeCardBorder: {
        borderColor: '#1D9A7C',
        borderWidth: 2,
    },
    cardImage: { ...(StyleSheet.absoluteFill as any) },
    cardContent: { flex: 1, justifyContent: 'flex-end', padding: 12 },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(29, 154, 124, 0.85)',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    categoryBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: fonts.button,
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: fonts.headlineBold,
        color: colors.onDarkPrimary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    productCountBadge: { fontSize: 11, fontFamily: fonts.button, color: 'rgba(255,255,255,0.85)' },
    explorePill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: radii.small,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    explorePillText: { fontSize: 11, fontFamily: fonts.button, color: colors.onDarkPrimary },
});