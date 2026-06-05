import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

const DEFAULT_ROOT_BACKGROUND = Colors.light.background;

if (Platform.OS !== 'web') {
  void SystemUI.setBackgroundColorAsync(DEFAULT_ROOT_BACKGROUND).catch(() => {
    // The root background is best-effort and should not block app startup.
  });
}

export function AppSystemBars() {
  const colorScheme = useColorScheme();
  const rootBackground = Colors[colorScheme === 'dark' ? 'dark' : 'light'].background;

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void SystemUI.setBackgroundColorAsync(rootBackground).catch((error) => {
      console.warn('Could not set app root background color.', error);
    });
  }, [rootBackground]);

  return (
    <StatusBar
      animated
      backgroundColor="transparent"
      style="auto"
      translucent
    />
  );
}
