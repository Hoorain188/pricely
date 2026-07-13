import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme/colors';

interface BrandMarkProps {
  size?: number;
  showWordmark?: boolean;
  align?: 'left' | 'center';
  animate?: boolean;
}

export default function BrandMark({
  size = 40,
  showWordmark = true,
  align = 'left',
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

  const iconPx = size;

  return (
    <Animated.View
      style={[
        styles.row,
        align === 'center' && styles.center,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={{ width: iconPx, height: iconPx, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width="100%" height="100%" viewBox="0 0 64 64" fill="none">
          {/* Main green tag body */}
          <Path
            d="M 28 4 L 52 4 A 8 8 0 0 1 60 12 L 60 56 A 8 8 0 0 1 52 64 L 12 64 A 8 8 0 0 1 4 56 L 4 28 Z"
            fill={colors.accentSolid}
          />
          {/* Hole */}
          <Circle cx="20" cy="20" r="6" fill={colors.surface} />
          
          {/* White zig-zag line cutting through the tag */}
          <Path
            d="M -4 52 L 24 28 L 36 38 L 56 20"
            fill="none"
            stroke={colors.surface}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Green Arrow Head jutting out top right */}
          <Path
            d="M 44 24 L 64 16 L 56 36 Z"
            fill={colors.accentSolid}
          />
          
          {/* White vertical slices to create the 3 bars */}
          <Rect x="20" y="44" width="4" height="24" fill={colors.surface} />
          <Rect x="36" y="38" width="4" height="30" fill={colors.surface} />
          <Rect x="52" y="32" width="4" height="36" fill={colors.surface} />
        </Svg>
      </View>

      {showWordmark && (
        <Text style={[styles.wordmark, { fontSize: size * 0.7 }]}>Pricely</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { justifyContent: 'center' },
  wordmark: {
    fontFamily: fonts.headline,
    color: colors.accentSolid,
    letterSpacing: -0.5,
  },
});