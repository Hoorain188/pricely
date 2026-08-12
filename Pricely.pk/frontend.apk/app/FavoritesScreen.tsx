import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Heart, Smartphone } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadows, gradients } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Sidebar from '../components/Sidebar';
import LottieHamburger from '../components/LottieHamburger';
import LottieBackButton from '../components/Lottiebackbutton';
import { useUserStore } from '../context/UserStore';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { favorites, toggleFavorite } = useUserStore();
  const [activeTab, setActiveTab] = useState<'all' | 'dropped'>('all');
  const [menuOpen, setMenuOpen] = useState(false);

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

  const filteredFavorites = favorites.filter((item) => {
    if (activeTab === 'dropped') return !!item.priceDrop;
    return true;
  });

  const droppedCount = favorites.filter((item) => !!item.priceDrop).length;

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

        {/* Tab Filters */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({favorites.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dropped' && styles.tabActive]}
            onPress={() => setActiveTab('dropped')}
          >
            <Text style={[styles.tabText, activeTab === 'dropped' && styles.tabTextActive]}>
              Price dropped ({droppedCount})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {filteredFavorites.map((item) => {
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ProductDetail', { productName: item.name, currentPrice: item.price })}
              >
                <Image
                  source={{ uri: `https://picsum.photos/seed/${item.name.replace(/\s/g, '')}/300/300` }}
                  style={styles.dealImage}
                  resizeMode="cover"
                />

                <View style={styles.detailsContainer}>
                  <View style={styles.nameRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => toggleFavorite({ name: item.name, price: item.price })}
                    >
                      <Ionicons name="heart" size={22} color={colors.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.middleRow}>
                    {item.priceDrop ? (
                      <View style={styles.priceDropBadge}>
                        <Text style={styles.priceDropText}>{item.priceDrop}</Text>
                      </View>
                    ) : (
                      <Text style={styles.statusText}>{item.statusText || 'Watching on 3 stores'}</Text>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{item.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredFavorites.length === 0 && (
            <View style={styles.emptyContainer}>
              <Heart size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Favorites Found</Text>
              <Text style={styles.emptySubtitle}>Items you save will appear here</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(dest) => {
          if (dest === 'Home') navigation.navigate('Home');
          else if (dest === 'Search') navigation.navigate('Search');
          else if (dest === 'Favorites') navigation.navigate('Favorites');
          else if (dest === 'Price Alerts' || dest === 'Notifications' || dest === 'Alerts') navigation.navigate('Alerts');
          else if (dest === 'Profile' || dest === 'Account') navigation.navigate('Account');
          else if (dest === 'Settings') navigation.navigate('Settings');
          else if (dest === 'Help & Support' || dest === 'HelpSupport' || dest === 'Help') navigation.navigate('HelpSupport');
          else if (['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Appliances', 'Mobiles', 'Categories'].includes(dest)) {
            navigation.navigate('Category', { categoryKey: 'mobiles_tablets' });
          }
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: '#0E6B4F', // Solid brand green matches All (6) active tab design
    borderColor: '#0E6B4F',
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.label,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium + 4,
    padding: 14,
    ...shadows.card,
  },
  dealImage: {
    width: 80,
    height: 80,
    borderRadius: radii.small,
    marginRight: 14,
    backgroundColor: colors.accentTint,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontFamily: fonts.label,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  middleRow: {
    marginVertical: 4,
  },
  priceDropBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D97706',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceDropText: {
    fontSize: 11,
    fontFamily: fonts.button,
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textTertiary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontFamily: fonts.monoEmphasis,
    color: '#0E6B4F',
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
});
