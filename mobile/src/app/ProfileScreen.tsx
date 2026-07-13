import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuthStore } from '../context/AuthContext';
import ScreenWrapper from '../components/ScreenWrapper';

const ProfileScreen: React.FC = () => {
  const { user, clearAuth } = useAuthStore();

  return (
    <ScreenWrapper style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons name="person-circle" size={80} color={colors.accentSolid} />
        <Text style={styles.title}>{user?.name || 'Amina Raza'}</Text>
        <Text style={styles.subtitle}>{user?.email || 'amina.raza@gmail.com'}</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={clearAuth}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
