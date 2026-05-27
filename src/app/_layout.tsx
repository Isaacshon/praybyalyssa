import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { FirstRunGate } from '@/components/praybor/FirstRunGate';
import { applyDefaultTextStyle } from '@/lib/apply-default-text-style';
import { preloadGrowScreenAssets } from '@/lib/praybor/grow-assets';

applyDefaultTextStyle();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Pretendard: require('../../assets/fonts/Pretendard-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }

    void preloadGrowScreenAssets().catch((error) => {
      console.warn('Could not preload Grow assets.', error);
    });
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <FirstRunGate>
        <AppTabs />
      </FirstRunGate>
    </ThemeProvider>
  );
}
