import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import CategoryScreen from './Categoryscreen';
import FavoritesScreen from './FavoritesScreen';
import AlertsScreen from './AlertsScreen';
//import AccountScreen from './AccountScreen';
import AnimatedTabBar from '../components/AnimatedTabBar';
import AdminNavigator from './AdminNavigator';
import { useAuthStore } from '../context/AuthContext';

// This is the ONE file that decides which screen the user sees.
//   - Not logged in     -> AuthScreen (login/signup, single-page swap)
//   - Logged in, admin  -> AdminNavigator (back-office dashboard + tools)
//   - Logged in, user   -> MainTabs (Home / Favorites / Alerts / Account),
//                          rendered with AnimatedTabBar so the active icon
//                          always matches whatever screen is actually shown.
//
// CategoryScreen is registered as a Tab.Screen (not a separate Stack) so
// that `navigation.navigate('Category', { categoryKey })` from HomeScreen
// resolves directly — AnimatedTabBar filters it out of the visible bar
// (see its `.filter(route.name !== 'Category')`), so it's reachable but
// never shown as its own tab icon.

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
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth">
            {(props) => <AuthScreen {...props} onAuthenticated={() => {}} />}
          </Stack.Screen>
        ) : user.role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
