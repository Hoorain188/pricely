import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import BrandIcon from '../components/BrandIcon';
import { colors, fonts, gradients } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

// Branded launch screen — shown once on cold start, before the
// auth/role check in AppNavigator decides where to send the user.
export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dot1Y = useRef(new Animated.Value(0)).current;
  const dot2Y = useRef(new Animated.Value(0)).current;
  const dot3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.spring(logoScale, { toValue: 1, damping: 8, stiffness: 100, useNativeDriver: true }).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(800),
      Animated.timing(lineWidth, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(1200),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const bob = (value: Animated.Value, delay: number, distance: number, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: -distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );

    bob(dot1Y, 0, 10, 2000).start();
    bob(dot2Y, 500, 14, 2400).start();
    bob(dot3Y, 1000, 8, 1800).start();

    const timer = setTimeout(onFinish, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.navy, '#081a14', '#081a14']} style={StyleSheet.absoluteFill} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="stripes" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
            <Line x1="0" y1="0" x2="0" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>

      <Animated.View style={[styles.dot, styles.dotGreen, { top: height * 0.24, left: width * 0.24 }, { transform: [{ translateY: dot1Y }] }]} />
      <Animated.View style={[styles.dot, styles.dotGold, { top: height * 0.36, right: width * 0.22, width: 6, height: 6 }, { transform: [{ translateY: dot2Y }] }]} />
      <Animated.View style={[styles.dot, styles.dotGreen, { top: height * 0.77, right: width * 0.28 }, { transform: [{ translateY: dot3Y }] }]} />
      <Animated.View style={[styles.dot, styles.dotGold, { top: height * 0.82, left: width * 0.28, width: 5, height: 5 }, { transform: [{ translateY: dot1Y }] }]} />

      <View style={styles.center}>
        <Animated.View style={[styles.iconContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <LinearGradient colors={gradients.accent} locations={gradients.accentLocations} style={styles.iconBox}>
            <BrandIcon size={44} color={colors.iconOnMango} />
          </LinearGradient>
        </Animated.View>

        <Animated.Text style={[styles.brandText, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          Pricely
        </Animated.Text>

        <Animated.View style={[styles.underline, { transform: [{ scaleX: lineWidth }] }]} />
      </View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        SEARCH ONCE · COMPARE EVERYWHERE
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { marginBottom: 16 },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: { fontSize: 42, fontFamily: fonts.headlineBold, color: colors.onDarkPrimary },
  underline: {
    width: 40,
    height: 2,
    backgroundColor: colors.accentMango,
    marginTop: 10,
  },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 10 },
  dotGreen: {
    backgroundColor: '#12A06A',
    shadowColor: '#12A06A',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dotGold: {
    backgroundColor: colors.accentMango,
    shadowColor: colors.accentMango,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tagline: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    color: colors.onDarkSecondary,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 2,
  },
});
