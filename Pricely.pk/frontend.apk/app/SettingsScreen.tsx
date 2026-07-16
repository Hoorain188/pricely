import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import LottieBackButton from '../components/Lottiebackbutton';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [priceDrops, setPriceDrops] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [selectedCurrency, setSelectedCurrency] = useState<'PKR' | 'USD'>('PKR');

  const handleSaveSettings = () => {
    Alert.alert('Success', 'Preferences saved successfully.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={gradients.primary}
        locations={gradients.primaryLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <LottieBackButton onPress={() => navigation.goBack()} size={30} />
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text style={styles.sectionHeader}>Account Settings</Text>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => navigation.navigate('Main', { screen: 'Account', params: { openEditProfile: true } })}
          >
            <Text style={styles.rowLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => navigation.navigate('Main', { screen: 'Account', params: { openEditProfile: true } })}
          >
            <Text style={styles.rowLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          {/* Currency selection */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Currency</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, selectedCurrency === 'PKR' && styles.selectorBtnActive]}
                onPress={() => setSelectedCurrency('PKR')}
              >
                <Text style={[styles.selectorBtnText, selectedCurrency === 'PKR' && styles.selectorBtnTextActive]}>Rs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, selectedCurrency === 'USD' && styles.selectorBtnActive]}
                onPress={() => setSelectedCurrency('USD')}
              >
                <Text style={[styles.selectorBtnText, selectedCurrency === 'USD' && styles.selectorBtnTextActive]}>USD</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Theme selection */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App Theme</Text>
            <View style={styles.selectorRow}>
              {(['system', 'light', 'dark'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.selectorBtn, selectedTheme === t && styles.selectorBtnActive]}
                  onPress={() => setSelectedTheme(t)}
                >
                  <Text style={[styles.selectorBtnText, selectedTheme === t && styles.selectorBtnTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email price alerts</Text>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: '#767577', true: '#0E6B4F' }}
              thumbColor={emailAlerts ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Instant price drop notifications</Text>
            <Switch
              value={priceDrops}
              onValueChange={setPriceDrops}
              trackColor={{ false: '#767577', true: '#0E6B4F' }}
              thumbColor={priceDrops ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    color: colors.onDarkPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorBtnActive: {
    backgroundColor: '#0E6B4F',
    borderColor: '#0E6B4F',
  },
  selectorBtnText: {
    fontSize: 12,
    fontFamily: fonts.label,
    color: colors.textSecondary,
  },
  selectorBtnTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#0E6B4F',
    borderRadius: radii.medium,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    ...shadows.button,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.button,
  },
});
