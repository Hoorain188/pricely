import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Smartphone, Headphones, HardDrive, Bell } from 'lucide-react-native';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Sidebar from '../components/Sidebar';
import LottieHamburger from '../components/LottieHamburger';
import LottieBackButton from '../components/Lottiebackbutton';
import { useUserStore } from '../context/UserStore';
import CustomAlertDialog from '../components/CustomAlertDialog';

const getIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('phone') || lower.includes('redmi') || lower.includes('galaxy') || lower.includes('iphone')) {
    return Smartphone;
  }
  if (lower.includes('headphones') || lower.includes('audio') || lower.includes('sony') || lower.includes('jbl')) {
    return Headphones;
  }
  return HardDrive;
};

export default function AlertsScreen() {
  const navigation = useNavigation<any>();
  const { alerts, toggleAlertActive, addAlert } = useUserStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Custom alert dialog states
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [newProductName, setNewProductName] = useState('');
  const [newCurrentPrice, setNewCurrentPrice] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');

  const handleCreateAlert = () => {
    if (!newProductName.trim()) {
      setErrorMessage('Product name is required');
      setErrorVisible(true);
      return;
    }
    if (!newCurrentPrice.trim()) {
      setErrorMessage('Current price is required');
      setErrorVisible(true);
      return;
    }
    if (!newTargetPrice.trim()) {
      setErrorMessage('Target price is required');
      setErrorVisible(true);
      return;
    }

    addAlert({
      name: newProductName,
      currentPrice: newCurrentPrice.startsWith('Rs') ? newCurrentPrice : `Rs ${newCurrentPrice}`,
      targetPrice: newTargetPrice.startsWith('Rs') ? newTargetPrice : `Rs ${newTargetPrice}`,
    });

    setModalVisible(false);
    setNewProductName('');
    setNewCurrentPrice('');
    setNewTargetPrice('');
    setSuccessMessage(`You will be notified for price drops on ${newProductName}!`);
    setSaveSuccessVisible(true);
  };

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={gradients.primary}
          locations={gradients.primaryLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <LottieBackButton onPress={() => navigation.navigate('Home')} size={30} />
          <Text style={styles.headerTitle}>Price alerts</Text>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <LottieHamburger isOpen={menuOpen} size={22} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {/* Add Price Alert Button below header */}
          <TouchableOpacity
            style={styles.contentAddButton}
            activeOpacity={0.85}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.contentAddButtonText}>Add New Price Alert</Text>
          </TouchableOpacity>

          {alerts.map((item) => {
            const isMet = item.remainingPrice.toLowerCase().includes('target') || item.remainingPrice.toLowerCase().includes('reached');
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card, 
                  isMet && styles.cardHighlighted, 
                  !item.active && styles.cardInactive
                ]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ProductDetail', { productName: item.name, currentPrice: item.currentPrice })}
              >
                <View style={styles.mainInfo}>
                  <Image
                    source={{ uri: `https://picsum.photos/seed/${item.name.replace(/\s/g, '')}/300/300` }}
                    style={styles.dealImage}
                    resizeMode="cover"
                  />

                  <View style={styles.details}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.targetText}>Notify below {item.targetPrice}</Text>
                  </View>

                  <Switch
                    value={item.active}
                    onValueChange={() => toggleAlertActive(item.id)}
                    trackColor={{ false: '#767577', true: '#0E6B4F' }}
                    thumbColor={item.active ? '#FFFFFF' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.bottomInfo}>
                  <Text style={styles.currentPriceText}>
                    Current: <Text style={styles.priceHighlight}>{item.currentPrice}</Text>
                  </Text>
                  <Text style={[
                    styles.remainingText,
                    isMet && styles.remainingTextReached
                  ]}>
                    {item.remainingPrice}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {alerts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Bell size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Active Alerts</Text>
              <Text style={styles.emptySubtitle}>Click "+" to set a new price alert</Text>
            </View>
          )}

          {/* Dynamic Target reached banners */}
          {alerts.filter(a => a.remainingPrice.includes('Target') && a.active).map(alert => (
            <View key={`reached-${alert.id}`} style={styles.targetReachedCard}>
              <View style={styles.targetIconContainer}>
                <Bell size={22} color="#0E6B4F" />
              </View>
              <View style={styles.targetTextDetails}>
                <Text style={styles.targetReachedTitle}>Target reached! 📣</Text>
                <Text style={styles.targetReachedSubtitle}>{alert.name} hit {alert.currentPrice}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Add Alert Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Price Alert</Text>

            <Text style={styles.inputLabel}>Product Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Redmi Note 13"
              value={newProductName}
              onChangeText={setNewProductName}
            />

            <Text style={styles.inputLabel}>Current Price (Rs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 54,999"
              keyboardType="numeric"
              value={newCurrentPrice}
              onChangeText={setNewCurrentPrice}
            />

            <Text style={styles.inputLabel}>Target Price (Rs)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 52,000"
              keyboardType="numeric"
              value={newTargetPrice}
              onChangeText={setNewTargetPrice}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateAlert}
              >
                <Text style={styles.saveButtonText}>Save Alert</Text>
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

      <CustomAlertDialog
        visible={saveSuccessVisible}
        title="Success"
        message={successMessage}
        confirmText="OK"
        onConfirm={() => setSaveSuccessVisible(false)}
        onCancel={() => setSaveSuccessVisible(false)}
        type="success"
      />

      <CustomAlertDialog
        visible={errorVisible}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
        type="danger"
      />
    </>
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
    textAlign: 'center',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentAddButton: {
    backgroundColor: '#0E6B4F',
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginVertical: 10,
    ...shadows.button,
  },
  contentAddButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.button,
    fontSize: 15,
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium + 4,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHighlighted: {
    borderColor: '#D97706',
    borderWidth: 1.5,
  },
  cardInactive: {
    opacity: 0.55,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealImage: {
    width: 60,
    height: 60,
    borderRadius: radii.small,
    marginRight: 14,
    backgroundColor: colors.accentTint,
  },
  details: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 15,
    fontFamily: fonts.label,
    color: colors.textPrimary,
  },
  targetText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPriceText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  priceHighlight: {
    fontFamily: fonts.monoEmphasis,
    color: '#D97706',
  },
  remainingText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  remainingTextReached: {
    color: '#D97706',
    fontFamily: fonts.headlineBold,
  },
  targetReachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: radii.medium + 4,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    padding: 16,
  },
  targetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.small,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  targetTextDetails: {
    flex: 1,
  },
  targetReachedTitle: {
    fontSize: 15,
    fontFamily: fonts.button,
    color: '#B45309',
  },
  targetReachedSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: '#B45309',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.label,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
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
    marginBottom: 6,
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
});
