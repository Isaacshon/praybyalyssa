/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0600',
    background: '#F7F7F2',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECECE4',
    textSecondary: '#736C67',
    tint: '#FF8A5B',
    accent: '#FF8A5B',
    softBlue: '#FFF1EA',
    softGreen: '#F6F2EA',
    cardShadow: '#D98E73',
  },
  dark: {
    text: '#FCEADE',
    background: '#0A0600',
    backgroundElement: '#173C40',
    backgroundSelected: '#264C50',
    textSecondary: '#E4CFC1',
    tint: '#FF8A5B',
    accent: '#FF8A5B',
    softBlue: '#3B2A24',
    softGreen: '#2B463F',
    cardShadow: '#0A0600',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
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
