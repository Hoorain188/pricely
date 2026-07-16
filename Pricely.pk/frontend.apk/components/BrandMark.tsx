import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface BrandMarkProps {
  height?: number; // rendered height; width follows the logo's own aspect ratio
  align?: 'left' | 'center';
  textColor?: string; // recolor the (single-tone, transparent-bg) logo — e.g. white for the dark Sidebar panel
}

// Pricely's full logo lockup — icon + "Pricely" wordmark, extracted from
// the brand PDF (assets/logo.png). Single-tone green artwork on a
// transparent background, so `tintColor` cleanly recolors it (e.g. white
// on the Sidebar's dark glass panel) without needing a separate asset per
// color.
//
// For the icon-only mark (no wordmark), use BrandIcon instead.
const LOGO_ASPECT = 1178 / 400;

export default function BrandMark({ height = 32, align = 'left', textColor }: BrandMarkProps) {
  const width = height * LOGO_ASPECT;

  return (
    <View style={[styles.row, align === 'center' && styles.center]}>
      <Image
        source={require('../../assets/logo.png')}
        style={[{ width, height }, textColor ? { tintColor: textColor } : null]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { justifyContent: 'center' },
});