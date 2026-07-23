import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet, Dimensions, Easing, LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import {
    House,
    Tag,
    Percent,
    Heart,
    User,
    Bell,
    Settings,
    Search,
    HelpCircle,
    LogOut,
    ChevronDown,
    X,
} from 'lucide-react-native';
import BrandMark from './BrandMark';
import { colors, fonts, radii } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);
const ROW_HEIGHT = 44;

const MENU: {
    key: string;
    label: string;
    Icon: typeof House;
    children?: string[];
}[] = [
        { key: 'home', label: 'Home', Icon: House },
        { key: 'search', label: 'Search', Icon: Search },
        {
            key: 'categories',
            label: 'Categories',
            Icon: Tag,
            children: ['Mobiles', 'Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Appliances'],
        },
        {
            key: 'deals',
            label: 'Deals',
            Icon: Percent,
            children: ['Best Drops', 'Trending', 'Price Alerts'],
        },
        { key: 'favorites', label: 'Favorites', Icon: Heart },
        {
            key: 'account',
            label: 'Account',
            Icon: User,
            children: ['Profile', 'Order History', 'Settings'],
        },
        { key: 'notifications', label: 'Notifications', Icon: Bell },
        { key: 'settings', label: 'Settings', Icon: Settings },
        { key: 'help', label: 'Help & Support', Icon: HelpCircle },
    ];

interface AccordionRowProps {
    Icon: typeof House;
    label: string;
    children?: string[];
    isExpanded: boolean;
    onToggle: () => void;
    onNavigate?: (label: string) => void;
    onLayoutRow: (y: number) => void;
}

// Controlled by the parent now (isExpanded/onToggle come from Sidebar's
// single `expandedKey` state) instead of managing its own boolean — that's
// what makes "only one section open at a time" possible.
function AccordionRow({ Icon, label, children, isExpanded, onToggle, onNavigate, onLayoutRow }: AccordionRowProps) {
    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const hasChildren = !!children?.length;
    const contentHeight = (children?.length || 0) * ROW_HEIGHT;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(heightAnim, {
                toValue: isExpanded ? contentHeight : 0,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(rotateAnim, { toValue: isExpanded ? 1 : 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [isExpanded]);

    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    const handlePress = () => {
        if (!hasChildren) {
            onNavigate?.(label);
            return;
        }
        onToggle();
    };

    return (
        <View onLayout={(e: LayoutChangeEvent) => onLayoutRow(e.nativeEvent.layout.y)}>
            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handlePress}>
                <Icon size={18} color="rgba(255,255,255,0.92)" strokeWidth={2} />
                <Text style={styles.rowLabel}>{label}</Text>
                {hasChildren && (
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <ChevronDown size={16} color="rgba(255,255,255,0.6)" />
                    </Animated.View>
                )}
            </TouchableOpacity>

            {hasChildren && (
                <Animated.View style={[styles.subMenu, { height: heightAnim }]}>
                    {children!.map((child) => (
                        <TouchableOpacity key={child} style={styles.subRow} activeOpacity={0.7} onPress={() => onNavigate?.(child)}>
                            <View style={styles.subDot} />
                            <Text style={styles.subLabel}>{child}</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            )}
        </View>
    );
}

interface SidebarProps {
    visible: boolean;
    onClose: () => void;
    onNavigate?: (destination: string) => void;
    onLogout?: () => void;
}

// Overlay drawer — stays mounted briefly after `visible` goes false so the
// slide-out animation can finish before unmounting.
export default function Sidebar({ visible, onClose, onNavigate, onLogout }: SidebarProps) {
    const [mounted, setMounted] = useState(visible);
    const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Accordion state lives HERE, not per-row — so opening one section
    // always closes whichever one was open, instead of everything stacking
    // up and overlapping the footer.
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);
    const rowOffsets = useRef<Record<string, number>>({});

    useEffect(() => {
        if (visible) {
            setMounted(true);
            Animated.parallel([
                Animated.timing(translateX, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
            ]).start();
        } else if (mounted) {
            Animated.parallel([
                Animated.timing(translateX, { toValue: -PANEL_WIDTH, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]).start(() => setMounted(false));
            setExpandedKey(null); // reset so it opens fresh next time
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!mounted) return null;

    const handleNavigate = (destination: string) => {
        onNavigate?.(destination);
        onClose();
    };

    const handleToggle = (key: string) => {
        const opening = expandedKey !== key;
        setExpandedKey(opening ? key : null);
        if (opening) {
            // Scroll the opened row into view once its submenu has expanded,
            // so it never ends up hidden behind (or overlapping) the footer.
            setTimeout(() => {
                const y = rowOffsets.current[key] ?? 0;
                scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
            }, 80);
        }
    };

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            <Animated.View style={[styles.panel, { width: PANEL_WIDTH, transform: [{ translateX }] }]}>
                <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFillObject} />
                <View style={styles.tint} />

                <View style={styles.panelContent}>
                    <View style={styles.header}>
                        <BrandMark height={30} textColor="#FFFFFF" />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={18} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable now — with only one section ever open, content
              rarely needs to scroll, but this guarantees nothing ever
              overlaps the footer even on a short screen. */}
                    <ScrollView ref={scrollRef} style={styles.menuList} showsVerticalScrollIndicator={false}>
                        {MENU.map((item) => (
                            <AccordionRow
                                key={item.key}
                                Icon={item.Icon}
                                label={item.label}
                                children={item.children}
                                isExpanded={expandedKey === item.key}
                                onToggle={() => handleToggle(item.key)}
                                onNavigate={handleNavigate}
                                onLayoutRow={(y) => {
                                    rowOffsets.current[item.key] = y;
                                }}
                            />
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onLogout}>
                            <LogOut size={18} color="rgba(255,255,255,0.92)" strokeWidth={2} />
                            <Text style={styles.rowLabel}>Log out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    panel: {
        position: 'absolute',
        top: 24,
        left: 24,
        bottom: 24,
        borderRadius: radii.large + 6,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    // Brand-tinted glass instead of the reference's plain black tint, so it
    // still reads as "Pricely" even with no photo background behind it.
    tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,29,23,0.55)' },
    panelContent: { flex: 1, paddingHorizontal: 14 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        marginBottom: 8,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: radii.small - 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    menuList: { flex: 1 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        height: ROW_HEIGHT,
        paddingHorizontal: 10,
        borderRadius: radii.small - 2,
    },
    rowLabel: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: 'rgba(255,255,255,0.95)' },

    subMenu: { overflow: 'hidden' },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: ROW_HEIGHT, paddingLeft: 42 },
    subDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
    subLabel: { fontSize: 13, fontFamily: fonts.body, color: 'rgba(255,255,255,0.75)' },

    footer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingVertical: 10, marginBottom: 8 },
});