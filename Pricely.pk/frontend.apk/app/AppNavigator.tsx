import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import CategoryScreen from './Categoryscreen';
import FavoritesScreen from './FavoritesScreen';
import AlertsScreen from './AlertsScreen';
import ProfileScreen from './ProfileScreen';
import ProductDetailScreen from './ProductDetailScreen';
import SettingsScreen from './SettingsScreen';
import HelpSupportScreen from './HelpSupportScreen';
import SearchScreen from './SearchScreen';
import AnimatedTabBar from '../components/AnimatedTabBar';
import AdminNavigator from './AdminNavigator';
import { useAuthStore } from '../context/AuthContext';

// This is the ONE file that decides which screen the user sees.
//   - Not logged in     -> AuthScreen (login/signup, single-page swap)
//   - Logged in, admin  -> AdminNavigator (back-office dashboard + tools)
//   - Logged in, user   -> MainTabs (Home / Category / Favorites / Alerts /
//                          Account / ProductDetail / Search) plus the
//                          Settings/HelpSupport stack routes on top.
//
// CategoryScreen and ProductDetail are registered as Tab.Screens (not a
// separate Stack) so that `navigation.navigate('Category', { categoryKey })`
// resolves directly — AnimatedTabBar filters them out of the visible bar,
// so they're reachable but never shown as their own tab icon.

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Category" component={CategoryScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
      <Tab.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isAuthenticated, loadStoredAuth, isLoading } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) {
    return null; // Render nothing while auth loads
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : user?.role !== 'user' ? (
          // Every back-office role (admin, support, readonly) goes to the
          // admin console — LoginForm already gates non-'user' roles to the
          // ADMIN tab, and AdminTabs handles the per-role screen gating
          // (e.g. readonly can't reach Duplicates/Users) from there.
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
