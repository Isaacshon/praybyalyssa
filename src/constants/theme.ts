/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const TextColors = {
  primary: '#2a1c13',
  secondary: '#513c25',
  tertiary: '#69543a',
} as const;

export const Colors = {
  light: {
    text: TextColors.primary,
    background: '#F7F7F2',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECECE4',
    textSecondary: TextColors.secondary,
    textTertiary: TextColors.tertiary,
    tint: '#FF8A5B',
    accent: '#FF8A5B',
    softBlue: '#FFF1EA',
    softGreen: '#F6F2EA',
    cardShadow: '#D98E73',
  },
  dark: {
    text: TextColors.primary,
    background: '#F7F7F2',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECECE4',
    textSecondary: TextColors.secondary,
    textTertiary: TextColors.tertiary,
    tint: '#FF8A5B',
    accent: '#FF8A5B',
    softBlue: '#FFF1EA',
    softGreen: '#F6F2EA',
    cardShadow: '#D98E73',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Pretendard',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Pretendard',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Pretendard',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
