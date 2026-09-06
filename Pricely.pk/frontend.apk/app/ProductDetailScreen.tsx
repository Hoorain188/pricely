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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ExternalLink, Tag } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from './api/client';
import { useUserStore } from '../context/UserStore';
import LottieLoader from '../components/Lottieloader';
import LottieBackButton from '../components/Lottiebackbutton';
import CustomAlertDialog from '../components/CustomAlertDialog';
import { categoryImageUri, getValidProductImage } from '../components/CategoryCarousel';
import { fetchProductDetail, fetchMegaPkProductDetail, fetchDarazProductDetail, fetchCompare, fetchPriceHistory, formatPrice, stripHtml, ProductDetail, CompareResponse, PriceHistoryResponse } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STORE_COLORS: Record<string, { bg: string; domain: string }> = {
  'telemart': { bg: '#1D9A7C', domain: 'telemart.pk' },
  'mega.pk': { bg: '#2F6FB0', domain: 'mega.pk' },
  'daraz': { bg: '#F57224', domain: 'daraz.pk' },
};

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorited, addAlert, alerts } = useUserStore();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handle = route.params?.handle || '';
  const productUrl = route.params?.url || '';
  const listingId = route.params?.id || route.params?.listingId;
  const fallbackName = route.params?.productName || 'Product Detail';
  const fallbackPrice = route.params?.currentPrice || 'Rs 0';
  const fallbackImage = route.params?.imageUrl;
  const storeName: string = (route.params?.store || '').toLowerCase();
  // Human-readable store name for display (capitalised properly)
  const displayStoreName = route.params?.store || (storeName === 'mega.pk' ? 'Mega.pk' : storeName === 'daraz' ? 'Daraz' : 'Telemart');

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse | null>(null);

  const productName = detail?.title || fallbackName;
  const rawPrice = detail?.variants && detail.variants.length > 0 ? detail.variants[0].price : fallbackPrice;
  const currentPrice = formatPrice(rawPrice);
  const images = detail?.images && detail.images.length > 0 ? detail.images : fallbackImage ? [fallbackImage] : [];

  // Favourites live on the server now, keyed by listing. The local store kept
  // them by product name, which meant they vanished with the app and could
  // never be matched to anything the price checker could watch.
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const existingAlert = alerts.find((a) => a.name === productName && a.active);
  const [alertPrice, setAlertPrice] = useState(existingAlert ? existingAlert.targetPrice.replace(/[^0-9]/g, '') : '50000');
  const alertActive = !!existingAlert;

  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    setDetail(null);
    setDetailError(null);
    setCompareData(null);
    setSelectedImageIdx(0);

    const numListingId = listingId ? Number(listingId) : undefined;
    const compareTitle = fallbackName !== 'Product Detail' ? fallbackName : undefined;

    console.log('listingId:', numListingId, 'compareData:', compareData);

    fetchCompare(numListingId, compareTitle).then((res) => {
      console.log('[ProductDetailScreen] compare result:', res);
      if (alive && res?.hasComparison) {
        setCompareData(res);
      }
    });

    const isDaraz = storeName === 'daraz';
    const isMega = storeName === 'mega.pk';
    const isTelemart = storeName === 'telemart' || storeName === '';

    if (isDaraz && productUrl) {
      setLoading(true);
      setDetailError(null);
      fetchDarazProductDetail(productUrl)
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
    } else if (isMega && productUrl) {
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
    } else if (isTelemart && handle) {
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
  }, [handle, productUrl, storeName, listingId, fallbackName]);

  // Fetch price history
  useEffect(() => {
    const numId = listingId ? Number(listingId) : 0;
    if (numId > 0) {
      fetchPriceHistory(numId, 30).then((res) => {
        if (res) setPriceHistory(res);
      });
    }
  }, [listingId]);

  const handleOpenStore = (urlToOpen?: string) => {
    const targetUrl = urlToOpen || detail?.url;
    if (targetUrl) {
      try {
        const fullUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') ? targetUrl : `https://${targetUrl}`;
        const parsed = new URL(fullUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          Linking.openURL(parsed.href).catch((err) => console.warn('Could not open store URL', err));
          api.logStoreClick(parsed.href).catch(() => {});
        }
      } catch {
        // Invalid URL format
      }
    }
  };

  const handleSetAlert = async () => {
    const target = Number(String(alertPrice).replace(/[^0-9.]/g, ''));
    if (!target || target <= 0) {
      setSuccessMessage('Enter a target price above zero.');
      setSaveSuccessVisible(true);
      return;
    }

    const alertImage = detail?.images?.[0] || route.params?.imageUrl || categoryImageUri(route.params?.categoryKey || productName || 'default');

    // Always save to local store first for instant UI response
    addAlert({
      name: productName,
      targetPrice: String(target),
      currentPrice,
      imageUrl: alertImage,
      categoryKey: route.params?.categoryKey,
      store: detail?.store || displayStoreName,
    });

    const numListingId = listingId ? Number(listingId) : 1;

    // Best-effort attempt to save to server
    try {
      console.log('[ALERT] listingId:', numListingId, 'target:', target);
      await api.setAlert(numListingId, target);
    } catch (err) {
      console.warn('[ALERT] Server sync skipped or failed, alert saved locally:', err);
    }

    setSuccessMessage(
      `We will notify you once ${productName} drops below Rs ${target.toLocaleString()}`,
    );
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

  // Ask the server whether this listing is already favourited, so the heart
  // is right the moment the screen opens rather than after the first tap.
  useEffect(() => {
    const numListingId = listingId ? Number(listingId) : undefined;
    if (!numListingId) return;
    let alive = true;
    api
      .favorites()
      .then((res) => {
        if (alive) setIsFav(res.items.some((f) => f.storeListingId === numListingId));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [listingId]);

  const handleLike = async () => {
    const numListingId = listingId ? Number(listingId) : undefined;
    if (favBusy) return;
    if (!numListingId) {
      console.warn('[FAV] no listingId — route params:', JSON.stringify(route.params));
      return;
    }

    setFavBusy(true);
    const next = !isFav;
    // Flip first: a heart that waits on the network feels broken.
    setIsFav(next);
    try {
      if (next) await api.addFavorite(numListingId);
      else await api.removeFavorite(numListingId);
    } catch (err) {
      console.warn('[FAV] failed:', err);
      setIsFav(!next);
    } finally {
      setFavBusy(false);
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 240 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                <Text style={styles.bestPriceText}>{detail?.store || displayStoreName}</Text>
              </View>
            </View>

            {/* External URL Action Button — works for ALL stores */}
            {(detail?.url || productUrl) ? (
              <TouchableOpacity style={styles.externalBtn} onPress={() => handleOpenStore(detail?.url || productUrl)}>
                <ExternalLink size={16} color="#FFFFFF" />
                <Text style={styles.externalBtnText}>
                  {storeName === 'daraz'
                    ? 'View full details & reviews on Daraz'
                    : `View on ${detail?.store || displayStoreName}`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Compare Live Prices Section (Shown when 2+ stores match) */}
          {compareData && compareData.hasComparison && compareData.offers.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Compare Prices Across Stores</Text>
              <View style={styles.storesBlock}>
                {compareData.offers.map((offer, idx) => {
                  const sKey = offer.store.toLowerCase();
                  const meta = STORE_COLORS[sKey] || { bg: '#0E6B4F', domain: `${sKey}.com` };
                  const isLowest = idx === 0;

                  return (
                    <View key={`${offer.store}-${idx}`} style={styles.storeRow}>
                      <View style={styles.storeLogoBadge}>
                        <View style={[styles.storeInitialBox, { backgroundColor: meta.bg }]}>
                          <Text style={styles.storeInitialText}>{offer.store[0]}</Text>
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.storeName}>{offer.store}</Text>
                            {isLowest && (
                              <View style={styles.lowestBadge}>
                                <Text style={styles.lowestBadgeText}>Lowest</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.storeDomain}>{meta.domain}</Text>
                        </View>
                      </View>

                      <View style={styles.storeActions}>
                        <Text style={[styles.storePrice, isLowest && { color: '#0E6B4F' }]}>
                          {formatPrice(offer.price)}
                        </Text>
                        <TouchableOpacity
                          style={styles.buyButton}
                          onPress={() => handleOpenStore(offer.url)}
                        >
                          <Text style={styles.buyButtonText}>View Offer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

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
          {priceHistory && priceHistory.hasHistory && priceHistory.points.length > 1 && (() => {
            const chartW = SCREEN_WIDTH - 68;
            const chartH = 120;
            const pad = { top: 12, bottom: 12, left: 10, right: 10 };
            const pts = priceHistory.points;
            const prices = pts.map(p => p.price);
            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const rangeP = maxP - minP || 1;
            const w = chartW - pad.left - pad.right;
            const h = chartH - pad.top - pad.bottom;

            const coords = pts.map((p, i) => ({
              x: pad.left + (pts.length > 1 ? (i / (pts.length - 1)) * w : w / 2),
              y: pad.top + h - ((p.price - minP) / rangeP) * h,
              price: p.price,
            }));

            const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
            const isBestPrice = priceHistory.currentPrice <= priceHistory.lowestPrice;

            return (
              <>
                <Text style={styles.sectionHeader}>Price History (30 Days)</Text>
                <View style={styles.chartCard}>
                  <Svg height={chartH} width={chartW}>
                    {/* Grid lines */}
                    <Path d={`M${pad.left},${pad.top} L${chartW - pad.right},${pad.top}`} stroke="#E9EFE9" strokeWidth="1" />
                    <Path d={`M${pad.left},${pad.top + h / 2} L${chartW - pad.right},${pad.top + h / 2}`} stroke="#E9EFE9" strokeWidth="1" />
                    <Path d={`M${pad.left},${pad.top + h} L${chartW - pad.right},${pad.top + h}`} stroke="#E9EFE9" strokeWidth="1" />
                    {/* Line */}
                    <Path d={pathD} fill="none" stroke="#0E6B4F" strokeWidth="3" />
                    {/* Data points */}
                    {coords.map((c, i) => (
                      <Circle key={i} cx={c.x} cy={c.y} r={4}
                        fill={i === coords.length - 1 ? '#0E6B4F' : c.price === priceHistory.lowestPrice ? '#D97706' : '#0E6B4F'}
                      />
                    ))}
                  </Svg>
                  <View style={styles.chartLabels}>
                    <Text style={[styles.chartLabel, { color: '#D97706' }]}>Lowest: {formatPrice(priceHistory.lowestPrice)}</Text>
                    <Text style={[styles.chartLabel, { color: '#0E6B4F' }]}>Current: {formatPrice(priceHistory.currentPrice)}</Text>
                  </View>
                  {isBestPrice && (
                    <View style={{ backgroundColor: '#EAF4EF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'center', marginTop: 8 }}>
                      <Text style={{ fontSize: 12, fontFamily: fonts.button, color: '#0E6B4F' }}>🎉 Best price in 30 days!</Text>
                    </View>
                  )}
                </View>
              </>
            );
          })()}

          {/* Price Alerts Form */}
          <Text style={styles.sectionHeader}>Set Price Alert</Text>
          <View style={styles.alertCard}>
            <Text style={styles.alertSubtitle}>Notify me when price drops below (Rs):</Text>
            <View style={styles.alertInputRow}>
              <TextInput
                value={alertPrice}
                onChangeText={setAlertPrice}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
    height: 48,
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
  lowestBadge: {
    backgroundColor: '#EAF4EF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowestBadgeText: {
    fontSize: 10,
    fontFamily: fonts.button,
    color: '#0E6B4F',
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
