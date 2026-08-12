import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieSearchIcon from './Lottiesearchicon';
import { colors, gradients, radii, fonts, shadows } from '../theme/colors';
import { Category } from '../services/catalogService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CARD_SPACING = 14;
const SNAP = CARD_WIDTH + CARD_SPACING;
const SIDE_PADDING = 20;

// Demo photos standing in for real category imagery until the catalog API
// supplies real product/category images. Using LoremFlickr (keyword-tagged
// Creative-Commons Flickr photos, no API key) instead of Unsplash's old
// `source.unsplash.com` redirect service — that one is heavily
// rate-limited/deprecated now and was the reason images weren't loading.
//
// Single specific tags (not comma-combined) match more reliably, and the
// `lock` value pins a specific photo per category so it doesn't change
// randomly on every reload — e.g. Mobiles always shows an actual phone.
const CATEGORY_IMAGE: Record<string, { tag: string; lock: number }> = {
    mobiles_tablets: { tag: 'iphone', lock: 34 },
    laptops_computers: { tag: 'laptop', lock: 12 },
    tv_entertainment: { tag: 'television', lock: 8 },
    home_appliances: { tag: 'fridge', lock: 45 },
    kitchen_appliances: { tag: 'kitchen', lock: 19 },
    cameras: { tag: 'camera', lock: 27 },
    audio: { tag: 'headphones', lock: 5 },
    wearables: { tag: 'smartwatch', lock: 44 },
    gaming: { tag: 'gaming', lock: 11 },
    accessories: { tag: 'charger', lock: 63 },
};
export const loremflickrUri = (tag: string, lock: number) => `https://loremflickr.com/500/700/${tag}?lock=${lock}`;

export const categoryImageUri = (key: string) => {
    const entry = CATEGORY_IMAGE[key] || { tag: 'shopping', lock: 1 };
    return loremflickrUri(entry.tag, entry.lock);
};

const SEARCH_EXAMPLES = [
    '"Redmi Note 13"...',
    '"Air Fryer 5L"...',
    '"Nike Air Max 90"...',
    '"PS5 Slim"...',
    '"Samsung 55" 4K TV"...',
];

interface CategoryCarouselProps {
    categories: Category[]; // excludes "All" — pass only real categories
    storeCount: number;
    onExplore: (categoryKey: string) => void;
    onSearchSubmit?: (query: string) => void;
}

// One unified hero card — light-green-to-navy gradient background, search
// bar pinned at the top and the coverflow category carousel living
// directly underneath it, both inside the same rounded panel (not two
// separate stacked cards).
export default function CategoryCarousel({ categories, storeCount, onExplore, onSearchSubmit }: CategoryCarouselProps) {
    const scrollX = useRef(new Animated.Value(0)).current;
    const [searchValue, setSearchValue] = useState('');

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

    return (
        <LinearGradient
            colors={gradients.heroCarousel}
            locations={gradients.heroCarouselLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
        >
            {/* Search bar — a frosted dark panel sitting ON the gradient, not a
          separate card, so it reads as one piece with the carousel below. */}
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

            {/* Coverflow-style category carousel — centered card full scale/
          opacity, neighbors shrink and fade on scroll. */}
            <Animated.FlatList
                data={categories}
                horizontal
                keyExtractor={(item: Category) => item.key}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
                renderItem={({ item, index }: { item: Category; index: number }) => {
                    const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];
                    const scale = scrollX.interpolate({ inputRange, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' });
                    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });

                    return (
                        <TouchableOpacity activeOpacity={0.92} onPress={() => onExplore(item.key)}>
                            <Animated.View style={[styles.card, { marginRight: CARD_SPACING, transform: [{ scale }], opacity }]}>
                                <Image
                                    source={{ uri: categoryImageUri(item.key) }}
                                    style={styles.cardImage}
                                    contentFit="cover"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                                {/* Same light-green-to-navy direction as the hero background,
                    just steeper, so each card's text stays legible. */}
                                <LinearGradient
                                    colors={['transparent', 'rgba(11,30,61,0.35)', colors.navy]}
                                    locations={[0, 0.55, 1]}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{item.label}</Text>
                                    <View style={styles.explorePill}>
                                        <Text style={styles.explorePillText}>Explore</Text>
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
        paddingBottom: 12,
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
        marginBottom: 10,
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

    // 130 instead of 190 — this one number was most of the wasted space.
    card: {
        width: CARD_WIDTH,
        height: 130,
        borderRadius: radii.medium,
        overflow: 'hidden',
        backgroundColor: colors.navy,
    },
    cardImage: { ...StyleSheet.absoluteFillObject },
    cardContent: { flex: 1, justifyContent: 'flex-end', padding: 12 },
    cardTitle: {
        fontSize: 14,
        fontFamily: fonts.headline,
        color: colors.onDarkPrimary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    explorePill: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    explorePillText: { fontSize: 10, fontFamily: fonts.button, color: colors.accentSolid, letterSpacing: 0.5, textTransform: 'uppercase' },
});