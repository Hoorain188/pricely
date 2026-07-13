import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import FavoritesScreen from './FavoritesScreen';
import AlertsScreen from './AlertsScreen';
import AccountScreen from './ProfileScreen';
import AnimatedTabBar from '../components/AnimatedTabBar';

// This is the ONE file that decides which screen the user sees.
//   - Not logged in  -> AuthScreen (login/signup, single-page swap)
//   - Logged in      -> MainTabs (Home / Favorites / Alerts / Account),
//                        rendered with AnimatedTabBar so the active icon
//                        always matches whatever screen is actually shown.

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  // Swap this for your real auth state (context, redux, a stored token
  // check, etc). This local flag is here so the file runs standalone.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth">
            {(props) => <AuthScreen {...props} onAuthenticated={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}