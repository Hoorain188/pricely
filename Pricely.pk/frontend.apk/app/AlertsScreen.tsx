import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Bell, Trash2 } from 'lucide-react-native';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Sidebar from '../components/Sidebar';
import LottieHamburger from '../components/LottieHamburger';
import LottieBackButton from '../components/Lottiebackbutton';
import CustomAlertDialog from '../components/CustomAlertDialog';
import { api, ApiError, formatPrice, type ShopperAlert } from './api/client';

export default function AlertsScreen() {
  const navigation = useNavigation<any>();
  const [menuOpen, setMenuOpen] = useState(false);

  const [alerts, setAlerts] = useState<ShopperAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.alerts();
      setAlerts(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload on focus: an alert set from a product page should be here by the
  // time the shopper comes back to look for it.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  React.useEffect(() => {
    const onBackPress = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation, menuOpen]);

  const handleRemove = async (alert: ShopperAlert) => {
    setRemovingId(alert.id);
    try {
      await api.removeAlert(alert.id);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not remove that alert.',
      );
      setErrorVisible(true);
    } finally {
      setRemovingId(null);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accentSolid} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.emptyTitle}>Couldn't load your alerts</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              load();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (alerts.length === 0) {
      return (
        <View style={styles.stateBox}>
          <Bell size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No price alerts yet</Text>
          {/* The old version had an "add alert" form here that took a typed
              product name. Nothing on the server could ever match that to a
              real listing, so the alert could never fire. Alerts are set from
              a product, where the listing is known. */}
          <Text style={styles.emptySubtitle}>
            Open a product and set a target price. We'll watch it for you.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Find a product</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {alerts.map((item) => {
          const busy = removingId === item.id;
          const gap =
            item.currentPrice !== null ? item.currentPrice - item.targetPrice : null;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, item.isTriggered && styles.cardHighlighted]}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('ProductDetail', {
                  id: item.storeListingId,
                  productName: item.title,
                  currentPrice:
                    item.currentPrice !== null ? formatPrice(item.currentPrice) : '',
                  imageUrl: item.imageUrl,
                })
              }
            >
              <View style={styles.mainInfo}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.dealImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.dealImage, styles.dealImageEmpty]} />
                )}

                <View style={styles.details}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.title ?? 'Product no longer listed'}
                  </Text>
                  <Text style={styles.targetText}>
                    Notify below {formatPrice(item.targetPrice)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleRemove(item)}
                  disabled={busy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Trash2 size={18} color={colors.danger} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.bottomInfo}>
                <Text style={styles.currentPriceText}>
                  Current:{' '}
                  <Text style={styles.priceHighlight}>
                    {item.currentPrice !== null ? formatPrice(item.currentPrice) : '—'}
                  </Text>
                </Text>
                <Text
                  style={[styles.remainingText, item.isTriggered && styles.remainingTextReached]}
                >
                  {item.isTriggered
                    ? 'Target reached!'
                    : gap !== null && gap > 0
                      ? `${formatPrice(gap)} to go`
                      : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {alerts
          .filter((a) => a.isTriggered)
          .map((alert) => (
            <View key={`reached-${alert.id}`} style={styles.targetReachedCard}>
              <View style={styles.targetIconContainer}>
                <Bell size={22} color="#0E6B4F" />
              </View>
              <View style={styles.targetTextDetails}>
                <Text style={styles.targetReachedTitle}>Target reached! 📣</Text>
                <Text style={styles.targetReachedSubtitle}>
                  {alert.title} hit{' '}
                  {alert.currentPrice !== null ? formatPrice(alert.currentPrice) : ''}
                </Text>
              </View>
            </View>
          ))}
      </>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        <LinearGradient
          colors={gradients.primary}
          locations={gradients.primaryLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <LottieBackButton onPress={handleBack} size={30} />
          <Text style={styles.headerTitle}>Price alerts</Text>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <LottieHamburger isOpen={menuOpen} size={22} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.accentSolid}
            />
          }
        >
          {renderBody()}
        </ScrollView>
      </SafeAreaView>

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(dest) => {
          if (dest === 'Home') navigation.navigate('Home');
          else if (dest === 'Search') navigation.navigate('Search');
          else if (dest === 'Favorites') navigation.navigate('Favorites');
          else if (dest === 'Price Alerts' || dest === 'Notifications' || dest === 'Alerts')
            navigation.navigate('Alerts');
          else if (dest === 'Profile' || dest === 'Account') navigation.navigate('Account');
          else if (dest === 'Settings') navigation.navigate('Settings');
          else if (dest === 'Help & Support' || dest === 'HelpSupport' || dest === 'Help')
            navigation.navigate('HelpSupport');
          else if (
            ['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Appliances', 'Mobiles', 'Categories'].includes(
              dest,
            )
          ) {
            navigation.navigate('Category', { categoryKey: 'mobiles_tablets' });
          }
        }}
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
  root: { flex: 1, backgroundColor: colors.background },
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

  scrollList: { padding: 16, paddingBottom: 40 },

  stateBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: colors.accentSolid,
    borderRadius: radii.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: '#FFFFFF', fontFamily: fonts.button, fontSize: 13.5 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    ...shadows.card,
  },
  cardHighlighted: { borderColor: colors.accentSolid },
  mainInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dealImage: {
    width: 52,
    height: 52,
    borderRadius: radii.small,
    backgroundColor: colors.background,
  },
  dealImageEmpty: { borderWidth: 1, borderColor: colors.border },
  details: { flex: 1 },
  productName: {
    fontSize: 14,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  targetText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 3,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  bottomInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentPriceText: { fontSize: 12.5, fontFamily: fonts.body, color: colors.textSecondary },
  priceHighlight: { fontFamily: fonts.mono, color: colors.textPrimary },
  remainingText: { fontSize: 12, fontFamily: fonts.label, color: colors.textTertiary },
  remainingTextReached: { color: colors.accentSolid },

  targetReachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentTint,
    borderRadius: radii.medium,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  targetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetTextDetails: { flex: 1 },
  targetReachedTitle: {
    fontSize: 14,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  targetReachedSubtitle: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
});