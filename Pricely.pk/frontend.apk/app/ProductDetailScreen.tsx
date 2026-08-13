import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Linking,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ExternalLink, Tag } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../context/UserStore';
import LottieLoader from '../components/Lottieloader';
import LottieBackButton from '../components/Lottiebackbutton';
import CustomAlertDialog from '../components/CustomAlertDialog';
import { fetchProductDetail, fetchMegaPkProductDetail, formatPrice, stripHtml, ProductDetail } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STORES_COMPARE = [
  { name: 'Telemart', price: 'Best Price', domain: 'telemart.pk', inStock: true, color: '#1D9A7C' },
  { name: 'Mega.pk', price: 'Rs 55,200', domain: 'mega.pk', inStock: true, color: '#2F6FB0' },
  { name: 'Daraz', price: 'Rs 56,100', domain: 'daraz.pk', inStock: true, color: '#E4326F' },
  { name: 'Amazon', price: 'Rs 58,400', domain: 'amazon.com', inStock: false, color: '#B7791F' },
];

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorited, addAlert, alerts } = useUserStore();

  const handle = route.params?.handle || '';
  const productUrl = route.params?.url || '';
  const fallbackName = route.params?.productName || 'Product Detail';
  const fallbackPrice = route.params?.currentPrice || 'Rs 0';
  const fallbackImage = route.params?.imageUrl;

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(!!handle || !!productUrl);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  const productName = detail?.title || fallbackName;
  const rawPrice = detail?.variants && detail.variants.length > 0 ? detail.variants[0].price : fallbackPrice;
  const currentPrice = formatPrice(rawPrice);
  const images = detail?.images && detail.images.length > 0 ? detail.images : fallbackImage ? [fallbackImage] : [];

  const isFav = isFavorited(productName);
  const existingAlert = alerts.find((a) => a.name === productName && a.active);
  const [alertPrice, setAlertPrice] = useState(existingAlert ? existingAlert.targetPrice.replace(/[^0-9]/g, '') : '50000');
  const alertActive = !!existingAlert;

  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const isMega = productUrl.includes('mega.pk');

    if (isMega && productUrl) {
      setLoading(true);
      setDetailError(null);
      fetchMegaPkProductDetail(productUrl)
        .then((data) => {
          if (alive) {
            setDetail(data);
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (alive) {
            setDetailError(err?.message || "Can't reach server — check connection");
            setLoading(false);
          }
        });
    } else if (handle) {
      setLoading(true);
      setDetailError(null);
      fetchProductDetail(handle)
        .then((data) => {
          if (alive) {
            setDetail(data);
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (alive) {
            setDetailError(err?.message || "Can't reach server — check connection");
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      alive = false;
    };
  }, [handle, productUrl]);

  const handleOpenStore = (urlToOpen?: string) => {
    const targetUrl = urlToOpen || detail?.url;
    if (targetUrl) {
      try {
        const fullUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') ? targetUrl : `https://${targetUrl}`;
        const parsed = new URL(fullUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          Linking.openURL(parsed.href).catch((err) => console.warn('Could not open store URL', err));
        }
      } catch {
        // Invalid URL format
      }
    }
  };

  const handleSetAlert = () => {
    addAlert({ name: productName, targetPrice: alertPrice, currentPrice });
    setSuccessMessage(`We will notify you once ${productName} drops below Rs ${Number(alertPrice).toLocaleString()}`);
    setSaveSuccessVisible(true);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const handleLike = () => {
    toggleFavorite({ name: productName, price: currentPrice });
    if (!isFav) {
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
        <LottieBackButton onPress={handleBack} size={30} />
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

      {detailError && (
        <View style={{ backgroundColor: '#FADBD8', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.button, color: '#C0392B' }}>
            ⚠️ {detailError}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <LottieLoader size={54} />
          <Text style={styles.loadingText}>Fetching product data from backend...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Product Image & Carousel */}
          <View style={styles.imageCard}>
            <Image
              source={{
                uri:
                  images.length > 0
                    ? images[selectedImageIdx] || images[0]
                    : `https://picsum.photos/seed/${productName.replace(/\s/g, '')}/400/400`,
              }}
              style={styles.productImage}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>

          {/* Image Thumbnail Selector */}
          {images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              {images.map((imgUrl, idx) => (
                <TouchableOpacity
                  key={`${imgUrl}-${idx}`}
                  onPress={() => setSelectedImageIdx(idx)}
                  style={[styles.thumbBox, selectedImageIdx === idx && styles.thumbBoxActive]}
                >
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.thumbImage}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Main Info */}
          <View style={styles.mainInfo}>
            {detail?.brand ? (
              <View style={styles.brandTag}>
                <Tag size={12} color="#0E6B4F" />
                <Text style={styles.brandText}>{detail.brand}</Text>
              </View>
            ) : null}

            <Text style={styles.productName}>{productName}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{currentPrice}</Text>
              <View style={styles.bestPriceBadge}>
                <Text style={styles.bestPriceText}>{detail?.store || 'Telemart'}</Text>
              </View>
            </View>

            {/* External URL Action Button */}
            {detail?.url ? (
              <TouchableOpacity style={styles.externalBtn} onPress={() => handleOpenStore(detail.url)}>
                <ExternalLink size={16} color="#FFFFFF" />
                <Text style={styles.externalBtnText}>View on {detail.store || 'Store'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Product Variants (if available) */}
          {detail?.variants && detail.variants.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>Available Options & Variants</Text>
              <View style={styles.variantsCard}>
                {detail.variants.map((v, i) => (
                  <View key={`${v.title}-${i}`} style={styles.variantRow}>
                    <Text style={styles.variantTitle}>{v.title || 'Standard'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.variantPrice}>{formatPrice(v.price)}</Text>
                      {v.available !== undefined && (
                        <View style={[styles.stockBadge, !v.available && styles.outStockBadge]}>
                          <Text style={[styles.stockText, !v.available && styles.outStockText]}>
                            {v.available ? 'In Stock' : 'Out'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Description Section */}
          {detail?.description ? (
            <>
              <Text style={styles.sectionHeader}>Product Description</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{stripHtml(detail.description)}</Text>
              </View>
            </>
          ) : null}

          {/* Price History Chart */}
          <Text style={styles.sectionHeader}>Price History (30 Days)</Text>
          <View style={styles.chartCard}>
            <Svg height="120" width={SCREEN_WIDTH - 68}>
              <Path d="M0,10 L300,10 M0,60 L300,60 M0,110 L300,110" stroke="#E9EFE9" strokeWidth="1" />
              <Path
                d="M10,20 Q80,10 140,80 T280,100"
                fill="none"
                stroke="#0E6B4F"
                strokeWidth="3.5"
              />
              <Circle cx="10" cy="20" r="5" fill="#0E6B4F" />
              <Circle cx="140" cy="80" r="5" fill="#D97706" />
              <Circle cx="280" cy="100" r="6" fill="#C0392B" />
            </Svg>
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>30d ago: High</Text>
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
                placeholder="e.g. 50000"
              />
              <TouchableOpacity style={styles.alertButton} onPress={handleSetAlert}>
                <Text style={styles.alertButtonText}>
                  {alertActive ? 'Active' : 'Set Alert'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Compare Stores */}
          <Text style={styles.sectionHeader}>Compare Stores</Text>
          <View style={styles.storesBlock}>
            {STORES_COMPARE.map((store) => {
              const isCurrentStore = store.name.toLowerCase() === (detail?.store || 'Telemart').toLowerCase();
              return (
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
                    <Text style={styles.storePrice}>
                      {isCurrentStore ? currentPrice : store.price}
                    </Text>
                    <TouchableOpacity
                      style={[styles.buyButton, !store.inStock && styles.buyButtonDisabled]}
                      disabled={!store.inStock}
                      onPress={() => handleOpenStore(isCurrentStore ? detail?.url : undefined)}
                    >
                      <Text style={styles.buyButtonText}>
                        {store.inStock ? 'Go to Store' : 'Out of stock'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 12,
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
    marginTop: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  productImage: {
    width: '100%',
    height: 240,
  },
  thumbScroll: {
    marginBottom: 16,
  },
  thumbBox: {
    width: 56,
    height: 56,
    borderRadius: radii.small,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBoxActive: {
    borderColor: '#0E6B4F',
    backgroundColor: '#EAF4EF',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
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
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF4EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.small,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  brandText: {
    fontSize: 11,
    fontFamily: fonts.button,
    color: '#0E6B4F',
  },
  productName: {
    fontSize: 19,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E6B4F',
    borderRadius: radii.small,
    paddingVertical: 10,
    marginTop: 4,
  },
  externalBtnText: {
    fontSize: 13,
    fontFamily: fonts.button,
    color: '#FFFFFF',
  },
  variantsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 10,
    ...shadows.card,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  variantTitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  variantPrice: {
    fontSize: 13,
    fontFamily: fonts.monoEmphasis,
    color: colors.textPrimary,
  },
  stockBadge: {
    backgroundColor: '#EAF4EF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outStockBadge: {
    backgroundColor: '#FADBD8',
  },
  stockText: {
    fontSize: 10,
    fontFamily: fonts.button,
    color: '#0E6B4F',
  },
  outStockText: {
    color: '#C0392B',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadows.card,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
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
