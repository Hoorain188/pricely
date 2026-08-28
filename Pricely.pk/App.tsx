import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { IBMPlexMono_600SemiBold, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import AppNavigator from './frontend.apk/app/AppNavigator';
import SplashScreen from './frontend.apk/app/SplashScreen';
import { AccountsProvider } from './frontend.apk/context/AccountsContext';
import { ActivityProvider } from './frontend.apk/context/ActivityContext';
import { TeamProvider } from './frontend.apk/context/TeamContext';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  if (fontError) {
    console.warn('Font loading failed, falling back to system fonts:', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F3' }}>
        <ActivityIndicator size="large" color="#0E6B4F" />
      </View>
    );
  }

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <AccountsProvider>
      <ActivityProvider>
        <TeamProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </TeamProvider>
      </ActivityProvider>
    </AccountsProvider>
  );
}