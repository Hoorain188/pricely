import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableWithoutFeedback, Animated, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, fonts } from '../theme/colors';

interface PressExpandButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  loading?: boolean;
}

export default function PressExpandButton({ label, onPress, style, loading }: PressExpandButtonProps) {
  const [width, setWidth] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const CIRCLE = 50;

  const onLayoutContainer = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: (loading || isPressed) ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [loading, isPressed]);

  const circleWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE, Math.max(width, CIRCLE)],
  });

  const arrowTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] });

  const textColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.accentSolid, '#f9f9f9'],
  });

  const handlePress = () => {
    if (loading) return;
    setIsPressed(true);
    setTimeout(() => {
      onPress();
      setIsPressed(false);
    }, 350);
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[styles.container, style]} onLayout={onLayoutContainer}>
        <Animated.View style={[styles.circle, { width: circleWidth }]}>
          <LinearGradient
            colors={gradients.primary}
            locations={gradients.primaryLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.foreground} pointerEvents="none">
          <Animated.Text style={[styles.label, { color: textColor }]}>
            {loading ? 'Please wait…' : label}
          </Animated.Text>
          <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
            <Svg width="15" height="10" viewBox="0 0 13 10">
              <Path d="M1,5 L11,5" stroke="#f9f9f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Polyline points="8 1 12 5 8 9" stroke="#f9f9f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: colors.accentSolid,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 50,
    overflow: 'hidden',
  },
  foreground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    fontFamily: fonts.button,
  },
});