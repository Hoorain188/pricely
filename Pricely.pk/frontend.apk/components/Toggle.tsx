import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ value, onValueChange, disabled = false }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value]);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.accentSolid] });
  const thumbTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 16] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbTranslate }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: { width: 38, height: 22, borderRadius: 11, justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', top: 2 },
});
