import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface AdminPlaceholderScreenProps {
  title: string;
}

export default function AdminPlaceholderScreen({ title }: AdminPlaceholderScreenProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontSize: 20, fontFamily: fonts.headline, color: colors.textPrimary },
  subtitle: { fontSize: 13, fontFamily: fonts.body, color: colors.textSecondary },
});