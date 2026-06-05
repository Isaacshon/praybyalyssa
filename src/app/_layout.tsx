import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppSystemBars } from '@/components/app-system-bars';
import { FirstRunGate } from '@/components/praybor/FirstRunGate';
import { applyDefaultTextStyle } from '@/lib/apply-default-text-style';

applyDefaultTextStyle();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppSystemBars />
      <AnimatedSplashOverlay />
      <FirstRunGate>
        <AppTabs />
      </FirstRunGate>
    </ThemeProvider>
  );
}
