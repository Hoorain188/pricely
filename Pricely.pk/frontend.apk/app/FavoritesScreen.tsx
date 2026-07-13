import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors, fonts } from '../theme/colors';
import ScreenWrapper from '../components/ScreenWrapper';

export default function FavoritesScreen() {
  return (
    <ScreenWrapper style={styles.wrapper}>
      <View style={styles.container}>
        <Heart size={48} color={colors.accentSolid} />
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>Your favorited items will appear here</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
});
