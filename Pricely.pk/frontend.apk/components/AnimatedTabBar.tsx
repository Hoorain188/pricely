import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LottieToggleIcon from './LottieToggleIcon';
import homeJson from '../../assets/Lottie/Home.json';
import heartJson from '../../assets/Lottie/Heart.json';
import bellJson from '../../assets/Lottie/Bell.json';
import { colors, fonts } from '../theme/colors';

// Lottie source per route name — Account has no custom asset yet, so it
// stays on the plain lucide User icon (see the fallback in TabItem below).
const LOTTIE_ICONS: Record<string, any> = {
  Home: homeJson,
  Favorites: heartJson,
  Alerts: bellJson,
};

const ACTIVE_COLOR = colors.accentSolid;
const INACTIVE_COLOR = colors.textTertiary;

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.menu, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes
        .map((route, idx) => ({ route, originalIndex: idx }))
        .filter(({ route }) => route.name !== 'Category' && route.name !== 'ProductDetail' && route.name !== 'Search')
        .map(({ route, originalIndex }) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === originalIndex;
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              label={label}
              isActive={isFocused}
              onPress={onPress}
            />
          );
        })}
    </View>
  );
}

function TabItem({
  routeName,
  label,
  isActive,
  onPress,
}: {
  routeName: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0)).current;
  const lottieSource = LOTTIE_ICONS[routeName];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: isActive ? -6 : 0, friction: 4, useNativeDriver: true }),
      Animated.spring(scale, { toValue: isActive ? 1.2 : 1, friction: 4, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: isActive ? 1 : 0, duration: isActive ? 200 : 150, useNativeDriver: true }),
      Animated.spring(dotScale, { toValue: isActive ? 1 : 0, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [isActive]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={1}>
      <View style={styles.iconWrapper}>
        <Animated.View
          style={[
            styles.glowEffect,
            {
              backgroundColor: ACTIVE_COLOR + '30',
              opacity: glowOpacity,
              transform: [{ scale: isActive ? 1.3 : 0.6 }],
            },
          ]}
        />
        <Animated.View style={[styles.iconContainer, { transform: [{ translateY }, { scale }] }]}>
          {lottieSource ? (
            <LottieToggleIcon
              source={lottieSource}
              active={isActive}
              size={24}
              colorFilters={[
                { keypath: 'home', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                { keypath: 'heart', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                { keypath: 'heart Fill', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                { keypath: 'bell', color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR },
              ]}
            />
          ) : (
            <User size={22} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} strokeWidth={isActive ? 2.5 : 2} />
          )}
        </Animated.View>
      </View>

      <Text style={[styles.menuText, { color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: isActive ? '700' : '500' }]}>
        {label}
      </Text>

      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: ACTIVE_COLOR, opacity: dotScale, transform: [{ scale: dotScale }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menu: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingTop: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  menuItem: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  iconContainer: { zIndex: 2 },
  iconWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  glowEffect: { position: 'absolute', width: 32, height: 32, borderRadius: 16, zIndex: 1 },
  menuText: { fontSize: 10, fontFamily: fonts.label, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
});