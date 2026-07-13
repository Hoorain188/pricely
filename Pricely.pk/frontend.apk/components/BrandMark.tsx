import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/colors';

interface BrandMarkProps {
  size?: number; // icon square size
  showWordmark?: boolean;
  align?: 'left' | 'center';
  textColor?: string; // override wordmark color for dark surfaces (e.g. the sidebar)
  animate?: boolean; // play a subtle entrance animation on mount
}

export default function BrandMark({
  size = 40,
  showWordmark = true,
  align = 'left',
  textColor,
  animate: doAnimate = false,
}: BrandMarkProps) {
  const scaleAnim = useRef(new Animated.Value(doAnimate ? 0.7 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(doAnimate ? 0 : 1)).current;

  useEffect(() => {
    if (!doAnimate) return;
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [doAnimate]);

  return (
    <Animated.View
      style={[
        styles.row,
        align === 'center' && styles.center,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.iconSquare, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 11.5 12.5 2 21 2 21 10.5 11.5 20 3 11.5Z"
            stroke={colors.onAccent}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx="16.2" cy="6.8" r="1.6" fill={colors.onAccent} />
        </Svg>
      </View>
      {showWordmark && (
        <Text style={[styles.wordmark, { fontSize: size * 0.55 }, textColor ? { color: textColor } : null]}>
          Pricely
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { justifyContent: 'center' },
  iconSquare: {
    backgroundColor: colors.accentSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fonts.headline,
    color: colors.textPrimary,
  },
});