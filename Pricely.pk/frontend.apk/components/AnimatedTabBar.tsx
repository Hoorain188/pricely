import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Heart, Bell, User } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '../theme/colors';

const ICONS: Record<string, typeof House> = {
  Home: House,
  Favorites: Heart,
  Alerts: Bell,
  Account: User,
};

const ACTIVE_COLOR = colors.accentSolid;
const INACTIVE_COLOR = colors.textTertiary;

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.menu, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const Icon = ICONS[route.name] ?? House;
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
            label={label}
            Icon={Icon}
            isActive={isFocused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  Icon,
  isActive,
  onPress,
}: {
  label: string;
  Icon: typeof House;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0)).current;

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
          <Icon size={22} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} strokeWidth={isActive ? 2.5 : 2} />
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
