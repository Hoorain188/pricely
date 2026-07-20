import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface BrandIconProps {
    size?: number; // rendered height; width follows the icon's own aspect ratio
    color?: string; // recolor the (single-tone, transparent-bg) icon
}

// Pricely's icon mark ONLY — no wordmark — extracted from the brand PDF
// (assets/logo-icon.png). Same single-tone green artwork on a transparent
// background as BrandMark, so `color` recolors it via tintColor.
//
// Use this for compact spots: tab bars, avatars, small badges. For the
// full icon + "Pricely" wordmark lockup, use BrandMark instead.
const ICON_ASPECT = 296 / 389;

export default function BrandIcon({ size = 28, color }: BrandIconProps) {
    const width = size * ICON_ASPECT;

    return (
        <Image
            source={require('../../assets/logo-icon.png')}
            style={[{ width, height: size }, color ? { tintColor: color } : null, styles.icon]}
            resizeMode="contain"
        />
    );
}

const styles = StyleSheet.create({
    icon: {},
});