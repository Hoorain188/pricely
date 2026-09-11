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
import { Heart } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Sidebar from '../components/Sidebar';
import LottieHamburger from '../components/LottieHamburger';
import LottieBackButton from '../components/Lottiebackbutton';
import { api, ApiError, formatPrice, type ShopperFavorite } from './api/client';
import { getValidProductImage } from '../components/CategoryCarousel';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const [menuOpen, setMenuOpen] = useState(false);

  const [favorites, setFavorites] = useState<ShopperFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.favorites();
      setFavorites(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your favourites.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload on focus so something favourited on a product page is here when the
  // shopper comes back to look for it.
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

  const handleRemove = async (fav: ShopperFavorite) => {
    if (!fav.storeListingId) return;
    setRemovingId(fav.id);
    // Remove from the list first — the heart is already filled, so waiting on
    // the network just makes the tap feel dead.
    setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
    try {
      await api.removeFavorite(fav.storeListingId);
    } catch {
      load();
    } finally {
      setRemovingId(null);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.accentSolid} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Couldn't load your favourites</Text>
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

    if (favorites.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Heart size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any product and it will be saved here.
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

    return favorites.map((item) => (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('ProductDetail', {
            id: item.storeListingId,
            productName: item.title,
            currentPrice: item.price !== null ? formatPrice(item.price) : '',
            imageUrl: item.imageUrl,
          })
        }
      >
        <Image
          source={{ uri: getValidProductImage(item.imageUrl, undefined, item.title) }}
          style={styles.dealImage}
          resizeMode="contain"
        />

        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.title ?? 'Product no longer listed'}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => handleRemove(item)}
              disabled={removingId === item.id}
            >
              <Ionicons name="heart" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <View style={styles.middleRow}>
            <Text style={styles.statusText}>
              {item.storeName ? `On ${item.storeName}` : 'Saved'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {item.price !== null ? formatPrice(item.price) : '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ));
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
          <Text style={styles.headerTitle}>Favorites</Text>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <LottieHamburger isOpen={menuOpen} size={22} />
          </TouchableOpacity>
        </LinearGradient>

        {/* The "Price dropped" tab is gone: it filtered on a priceDrop field the
            local store invented and the API has no equivalent for. Showing a
            drop needs the previous price, which belongs with the alert checker
            that watches for one. */}

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

  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  dealImage: {
    width: 76,
    height: 76,
    borderRadius: radii.small,
    backgroundColor: colors.background,
  },
  dealImageEmpty: { borderWidth: 1, borderColor: colors.border },
  detailsContainer: { flex: 1, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  productName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.label,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  middleRow: { marginTop: 4 },
  statusText: { fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary },
  priceRow: { marginTop: 6 },
  price: { fontSize: 15, fontFamily: fonts.mono, color: colors.textPrimary },

  emptyContainer: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 24 },
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
});