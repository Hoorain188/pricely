import MaskedView from "@react-native-masked-view/masked-view";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(15);
  const lineWidth = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });
    logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });

    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );

    lineWidth.value = withDelay(800, withTiming(1, { duration: 400 }));

    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    dot1Y.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    dot2Y.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    dot3Y.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    // Navigate to tabs after animation completes
    const timer = setTimeout(() => {
      router.replace("/search-results");
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineWidth.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0d2b22", "#0a1f18", "#081a14"]}
        style={StyleSheet.absoluteFill}
      />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="stripes"
            patternUnits="userSpaceOnUse"
            width="40"
            height="40"
            patternTransform="rotate(45)"
          >
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2="40"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>

      <Animated.View
        style={[
          styles.dot,
          styles.dotBlue,
          { top: height * 0.24, left: width * 0.24 },
          dot1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          styles.dotOrange,
          { top: height * 0.36, right: width * 0.22, width: 6, height: 6 },
          dot2Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          styles.dotBlue,
          { top: height * 0.77, right: width * 0.28 },
          dot3Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          styles.dotOrange,
          { top: height * 0.82, left: width * 0.28, width: 5, height: 5 },
          dot1Style,
        ]}
      />

      <View style={styles.center}>
        <Animated.View style={[styles.iconContainer, logoStyle]}>
          <LinearGradient
            colors={["#f4c95d", "#e08a2e"]}
            style={styles.iconBox}
          >
            <Image
              source={require("../assets/images/pricely-icon-darkbrown.png")}
              style={{ width: 50, height: 50 }}
              contentFit="contain"
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={textStyle}>
          <MaskedView
            maskElement={<Text style={styles.brandText}>Pricely</Text>}
          >
            <LinearGradient
              colors={["#e8f4f0", "#5b9bd5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.brandText, { opacity: 0 }]}>Pricely</Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>

        <Animated.View style={[styles.underline, lineStyle]} />
      </View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        SEARCH ONCE · COMPARE EVERYWHERE
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a1f18" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconContainer: { marginBottom: 16 },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  brandText: { fontSize: 42, fontFamily: "serif", fontWeight: "700" },
  underline: {
    width: 40,
    height: 2,
    backgroundColor: "#e0a83e",
    marginTop: 10,
  },
  dot: { position: "absolute", width: 8, height: 8, borderRadius: 10 },
  dotBlue: {
    backgroundColor: "#4a90e2",
    shadowColor: "#4a90e2",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dotOrange: {
    backgroundColor: "#e0a83e",
    shadowColor: "#e0a83e",
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tagline: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    letterSpacing: 2,
  },
});
