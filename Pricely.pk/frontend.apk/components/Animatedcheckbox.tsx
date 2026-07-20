import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  size?: number;
  error?: boolean;
}

// The box border thickens on check, and the checkmark draws itself in
// with a stroke-dashoffset animation instead of just popping in.
// Colors come entirely from the theme — nothing hardcoded.
export default function AnimatedCheckbox({ checked, onChange, label, size = 28, error }: AnimatedCheckboxProps) {
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: checked ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [checked]);

  const dashArray = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['241 9999999', '325 9999999'],
  });
  
  const dashOffset = 0;

  const strokeColor = error
    ? colors.danger
    : anim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.accentSolid],
      });

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => onChange(!checked)}>
      <View style={[styles.box, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 64 64" style={StyleSheet.absoluteFillObject}>
          <AnimatedPath
            d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
            fill="none"
            stroke={strokeColor}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashArray as any}
            strokeDashoffset={dashOffset as any}
          />
        </Svg>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19 },
});
