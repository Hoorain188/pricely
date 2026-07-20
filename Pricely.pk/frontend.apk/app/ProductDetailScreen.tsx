import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../context/UserStore';
import LottieBackButton from '../components/Lottiebackbutton';
import CustomAlertDialog from '../components/CustomAlertDialog';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STORES_COMPARE = [
  { name: 'Telemart', price: 'Rs 54,999', domain: 'telemart.pk', inStock: true, color: '#1D9A7C' },
  { name: 'Mega.pk', price: 'Rs 55,200', domain: 'mega.pk', inStock: true, color: '#2F6FB0' },
  { name: 'Daraz', price: 'Rs 56,100', domain: 'daraz.pk', inStock: true, color: '#E4326F' },
  { name: 'Amazon', price: 'Rs 58,400', domain: 'amazon.com', inStock: false, color: '#B7791F' },
];

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorited, addAlert, alerts } = useUserStore();

  const productName = route.params?.productName || 'Redmi Note 13 8/256';
  const currentPrice = route.params?.currentPrice || 'Rs 54,999';

  const isFav = isFavorited(productName);
  const existingAlert = alerts.find((a) => a.name === productName && a.active);
  const [alertPrice, setAlertPrice] = useState(existingAlert ? existingAlert.targetPrice.replace(/[^0-9]/g, '') : '53000');
  const alertActive = !!existingAlert;

  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSetAlert = () => {
    addAlert({ name: productName, targetPrice: alertPrice, currentPrice });
    setSuccessMessage(`We will notify you once ${productName} drops below Rs ${Number(alertPrice).toLocaleString()}`);
    setSaveSuccessVisible(true);
  };

  const handleLike = () => {
    toggleFavorite({ name: productName, price: currentPrice });
    if (!isFav) {
      // Toggle favorite AND navigate directly to Favorites wishlist screen
      navigation.navigate('Favorites');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <LinearGradient
        colors={gradients.primary}
        locations={gradients.primaryLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <LottieBackButton onPress={() => navigation.goBack()} size={30} />
        <Text style={styles.headerTitle} numberOfLines={1}>{productName}</Text>
        <TouchableOpacity
          style={styles.favButton}
          onPress={handleLike}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={22}
            color={isFav ? '#E74C3C' : colors.onDarkPrimary}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: `https://picsum.photos/seed/${productName.replace(/\s/g, '')}/400/400` }}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>

        {/* Product Title and Price */}
        <View style={styles.mainInfo}>
          <Text style={styles.productName}>{productName}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{currentPrice}</Text>
            <View style={styles.bestPriceBadge}>
              <Text style={styles.bestPriceText}>Best price found</Text>
            </View>
          </View>
        </View>

        {/* Price History Chart */}
        <Text style={styles.sectionHeader}>Price History (30 Days)</Text>
        <View style={styles.chartCard}>
          <Svg height="120" width={SCREEN_WIDTH - 68}>
            {/* Draw grid lines */}
            <Path d="M0,10 L300,10 M0,60 L300,60 M0,110 L300,110" stroke="#E9EFE9" strokeWidth="1" />
            {/* Draw curve path representing price drop */}
            <Path
              d="M10,20 Q80,10 140,80 T280,100"
              fill="none"
              stroke="#0E6B4F"
              strokeWidth="3.5"
            />
            {/* Add circles on key points */}
            <Circle cx="10" cy="20" r="5" fill="#0E6B4F" />
            <Circle cx="140" cy="80" r="5" fill="#D97706" />
            <Circle cx="280" cy="100" r="6" fill="#C0392B" />
          </Svg>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>30d ago: Rs 58,499</Text>
            <Text style={styles.chartLabel}>Current: {currentPrice}</Text>
          </View>
        </View>

        {/* Price Alerts Form */}
        <Text style={styles.sectionHeader}>Set Price Alert</Text>
        <View style={styles.alertCard}>
          <Text style={styles.alertSubtitle}>Notify me when price drops below (Rs):</Text>
          <View style={styles.alertInputRow}>
            <TextInput
              value={alertPrice}
              onChangeText={setAlertPrice}
              style={styles.alertInput}
              keyboardType="number-pad"
              placeholder="e.g. 53000"
            />
            <TouchableOpacity style={styles.alertButton} onPress={handleSetAlert}>
              <Text style={styles.alertButtonText}>
                {alertActive ? 'Active' : 'Set Alert'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Compare Stores */}
        <Text style={styles.sectionHeader}>Compare Prices</Text>
        <View style={styles.storesBlock}>
          {STORES_COMPARE.map((store, i) => (
            <View key={store.name} style={styles.storeRow}>
              <View style={styles.storeLogoBadge}>
                <View style={[styles.storeInitialBox, { backgroundColor: store.color }]}>
                  <Text style={styles.storeInitialText}>{store.name[0]}</Text>
                </View>
                <View>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeDomain}>{store.domain}</Text>
                </View>
              </View>

              <View style={styles.storeActions}>
                <Text style={styles.storePrice}>{store.price}</Text>
                <TouchableOpacity
                  style={[styles.buyButton, !store.inStock && styles.buyButtonDisabled]}
                  disabled={!store.inStock}
                >
                  <Text style={styles.buyButtonText}>
                    {store.inStock ? 'Go to Store' : 'Out of stock'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <CustomAlertDialog
        visible={saveSuccessVisible}
        title="Alert Set Success"
        message={successMessage}
        confirmText="OK"
        onConfirm={() => setSaveSuccessVisible(false)}
        onCancel={() => setSaveSuccessVisible(false)}
        type="success"
      />
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
  favButton: {
    width: 36,
    height: 36,
    borderRadius: radii.small,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium + 4,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...shadows.card,
  },
  productImage: {
    width: '100%',
    height: 220,
  },
  mainInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadows.card,
  },
  productName: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 22,
    fontFamily: fonts.monoEmphasis,
    color: '#0E6B4F',
  },
  bestPriceBadge: {
    backgroundColor: '#EAF4EF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bestPriceText: {
    fontSize: 12,
    fontFamily: fonts.button,
    color: '#0E6B4F',
  },
  sectionHeader: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadows.card,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadows.card,
  },
  alertSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  alertInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  alertInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  alertButton: {
    backgroundColor: '#0E6B4F',
    borderRadius: radii.small,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.button,
    fontSize: 14,
  },
  storesBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storeLogoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeInitialBox: {
    width: 38,
    height: 38,
    borderRadius: radii.small - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInitialText: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    color: '#FFFFFF',
  },
  storeName: {
    fontSize: 14,
    fontFamily: fonts.label,
    color: colors.textPrimary,
  },
  storeDomain: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textTertiary,
  },
  storeActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  storePrice: {
    fontSize: 14,
    fontFamily: fonts.monoEmphasis,
    color: colors.textPrimary,
  },
  buyButton: {
    backgroundColor: '#0E6B4F',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buyButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  buyButtonText: {
    fontSize: 12,
    fontFamily: fonts.button,
    color: '#FFFFFF',
  },
});
