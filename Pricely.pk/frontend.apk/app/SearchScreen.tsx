import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import ScreenWrapper from '../components/ScreenWrapper';

const SearchScreen: React.FC = () => {
  return (
    <ScreenWrapper style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons name="search" size={48} color={colors.accentMango} />
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Search products to compare prices</Text>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default SearchScreen;
