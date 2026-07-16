import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, fonts, radii, shadows } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LottieHamburger from '../components/LottieHamburger';
import { useUserStore } from '../context/UserStore';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop',
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, setAuth, clearAuth, token } = useAuthStore();
  const { favorites, alerts } = useUserStore();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  // Modal visibility
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit profile states
  const [editName, setEditName] = useState(user?.name || 'Amina Raza');
  const [editEmail, setEditEmail] = useState(user?.email || 'amina.raza@gmail.com');
  const [editPassword, setEditPassword] = useState(user?.password || '••••••••');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');

  const initials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
    : 'AR';
  
  const name = user?.name || 'Amina Raza';
  const email = user?.email || 'amina.raza@gmail.com';

  useEffect(() => {
    if (route.params?.openEditProfile) {
      setEditName(name);
      setEditEmail(email);
      setEditPassword(user?.password || '••••••••');
      setSelectedAvatar(user?.avatar || '');
      setEditModalVisible(true);
    }
  }, [route.params]);

  const totalSavedVal = [...favorites, ...alerts].reduce((acc, item) => {
    const priceStr = 'price' in item ? item.price : item.currentPrice;
    const val = parseFloat(priceStr.replace(/[^0-9]/g, '')) || 0;
    return acc + val;
  }, 0);
  const totalSavedString = totalSavedVal > 0 ? totalSavedVal.toLocaleString() : '0';

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }

    try {
      await setAuth(
        { 
          id: user?.id || '1', 
          name: editName, 
          email: editEmail, 
          password: editPassword !== '••••••••' ? editPassword : user?.password,
          avatar: selectedAvatar 
        },
        token || 'mock-jwt-token'
      );
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* Top Header menu trigger */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <LottieHamburger isOpen={menuOpen} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar and Name */}
          <View style={styles.avatarSection}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#0052D4', '#4364F7', '#6FB1FC']}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.displayName}>{name}</Text>
              <Text style={styles.displayEmail}>{email}</Text>
              <TouchableOpacity 
                style={styles.editProfileLink} 
                onPress={() => {
                  setEditName(name);
                  setEditEmail(email);
                  setEditPassword(user?.password || '••••••••');
                  setSelectedAvatar(user?.avatar || '');
                  setEditModalVisible(true);
                }}
              >
                <Text style={styles.editProfileText}>Edit Profile ›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stat Cards */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('Favorites')}
            >
              <Text style={styles.statNumber}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Text style={styles.statNumber}>{alerts.length}</Text>
              <Text style={styles.statLabel}>Alerts</Text>
            </TouchableOpacity>
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <Text style={styles.statSavedCurrency}>Rs</Text>
              <Text style={styles.statNumberHighlight}>{totalSavedString}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>

          {/* Preferences Section */}
          <Text style={styles.sectionHeader}>Preferences</Text>
          <View style={styles.optionsBlock}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Push notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#767577', true: '#0E6B4F' }}
                thumbColor={pushNotifications ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.optionLabel}>Currency & Region</Text>
              <Text style={styles.optionValue}>PKR (Rs) ›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.optionLabel}>App Theme</Text>
              <Text style={styles.optionValue}>System ›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.optionLabel}>Default Sorting</Text>
              <Text style={styles.optionValue}>Lowest price ›</Text>
            </TouchableOpacity>
          </View>

          {/* Log out Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={clearAuth}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Choose Profile Picture</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              <TouchableOpacity
                style={[styles.presetItem, !selectedAvatar && styles.presetItemActive]}
                onPress={() => setSelectedAvatar('')}
              >
                <View style={styles.avatarInitialsFallback}>
                  <Text style={styles.avatarInitialsText}>{initials}</Text>
                </View>
              </TouchableOpacity>
              {AVATAR_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetItem, selectedAvatar === preset && styles.presetItemActive]}
                  onPress={() => setSelectedAvatar(preset)}
                >
                  <Image source={{ uri: preset }} style={styles.presetImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(dest) => {
          if (dest === 'Home') navigation.navigate('Home');
          else if (dest === 'Favorites') navigation.navigate('Favorites');
          else if (dest === 'Price Alerts' || dest === 'Notifications') navigation.navigate('Alerts');
          else if (dest === 'Profile' || dest === 'Account') navigation.navigate('Account');
          else if (dest === 'Settings') navigation.navigate('Settings');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radii.small,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    ...shadows.card,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: fonts.button,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nameContainer: {
    marginLeft: 18,
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
  },
  displayEmail: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editProfileLink: {
    marginTop: 6,
  },
  editProfileText: {
    fontSize: 13,
    fontFamily: fonts.button,
    color: '#0E6B4F',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statCardHighlight: {
    borderColor: '#D97706',
    borderWidth: 2,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: fonts.monoEmphasis,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statSavedCurrency: {
    fontSize: 12,
    fontFamily: fonts.button,
    color: '#D97706',
    marginBottom: 2,
  },
  statNumberHighlight: {
    fontSize: 20,
    fontFamily: fonts.monoEmphasis,
    color: '#D97706',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  sectionHeader: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  optionsBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
    ...shadows.card,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  optionValue: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFAAAA',
    borderRadius: radii.medium,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontFamily: fonts.button,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 20,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 18,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.label,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontFamily: fonts.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#0E6B4F',
  },
  saveButtonText: {
    fontFamily: fonts.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  presetItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetItemActive: {
    borderColor: '#0E6B4F',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitialsFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4364F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontFamily: fonts.button,
    fontSize: 18,
  },
});
