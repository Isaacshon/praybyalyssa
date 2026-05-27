import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type TapeFamily = 'yellow' | 'pink' | 'purple' | 'mint' | 'cyan' | 'orange' | 'green';

export type MaskingTapeTheme = {
  backgroundColor: string;
  borderColor: string;
  family: TapeFamily;
  grain: string;
  line: string;
  shadow: string;
  variant?: number;
};

type MaskingTapeSurfaceProps = {
  theme: MaskingTapeTheme;
  tearColor?: string;
};

const tapePalette: MaskingTapeTheme[] = [
  theme('yellow', 'rgba(255, 221, 92, 0.50)', 'rgba(199, 153, 34, 0.24)', 'rgba(255, 243, 164, 0.26)', 'rgba(178, 133, 20, 0.18)', 'rgba(128, 96, 10, 0.10)'),
  theme('pink', 'rgba(255, 150, 184, 0.49)', 'rgba(207, 75, 120, 0.23)', 'rgba(255, 208, 224, 0.24)', 'rgba(184, 55, 101, 0.18)', 'rgba(128, 38, 68, 0.10)'),
  theme('purple', 'rgba(196, 150, 231, 0.48)', 'rgba(125, 78, 171, 0.22)', 'rgba(225, 199, 244, 0.22)', 'rgba(112, 67, 156, 0.18)', 'rgba(78, 44, 112, 0.10)'),
  theme('mint', 'rgba(124, 229, 174, 0.47)', 'rgba(41, 151, 91, 0.21)', 'rgba(190, 250, 219, 0.23)', 'rgba(32, 126, 74, 0.16)', 'rgba(20, 91, 51, 0.09)'),
  theme('cyan', 'rgba(102, 215, 232, 0.47)', 'rgba(30, 139, 156, 0.21)', 'rgba(183, 244, 250, 0.23)', 'rgba(20, 122, 141, 0.16)', 'rgba(12, 82, 96, 0.09)'),
  theme('orange', 'rgba(255, 168, 82, 0.49)', 'rgba(207, 96, 26, 0.23)', 'rgba(255, 217, 165, 0.24)', 'rgba(181, 83, 18, 0.18)', 'rgba(128, 54, 13, 0.10)'),
  theme('green', 'rgba(159, 222, 86, 0.47)', 'rgba(89, 145, 31, 0.20)', 'rgba(215, 245, 159, 0.22)', 'rgba(75, 122, 25, 0.16)', 'rgba(49, 85, 15, 0.09)'),
];

export function getMaskingTapeTheme(key: string, paperColor?: string, salt = ''): MaskingTapeTheme {
  const blockedFamily = getPaperFamily(paperColor);
  const candidates = tapePalette.filter((item) => item.family !== blockedFamily);
  const palette = candidates.length > 0 ? candidates : tapePalette;
  const hash = hashString(`${key}:${paperColor ?? 'none'}:${salt}`);
  const index = hash % palette.length;

  return { ...palette[index], variant: Math.floor(hash / palette.length) % 5 };
}

export function MaskingTapeSurface({ theme, tearColor = '#FFFFFF' }: MaskingTapeSurfaceProps) {
  const variant = theme.variant ?? 0;

  return (
    <>
      <View pointerEvents="none" style={[styles.fiberWash, tapeFiberStyles[variant], { backgroundColor: theme.grain }]} />
      <View pointerEvents="none" style={[styles.brushBand, styles.brushBandTop, { backgroundColor: theme.grain }]} />
      <View pointerEvents="none" style={[styles.brushBand, styles.brushBandMiddle, { backgroundColor: theme.backgroundColor }]} />
      <View pointerEvents="none" style={[styles.brushBand, styles.brushBandBottom, { backgroundColor: theme.shadow }]} />
      <View pointerEvents="none" style={[styles.crease, tapeCreaseStyles[variant], { backgroundColor: theme.line }]} />
      <View pointerEvents="none" style={[styles.softCrease, tapeSoftCreaseStyles[variant], { backgroundColor: theme.grain }]} />
      <View pointerEvents="none" style={[styles.leftTear, tapeLeftTearStyles[variant], { backgroundColor: tearColor }]} />
      <View pointerEvents="none" style={[styles.rightTear, tapeRightTearStyles[variant], { backgroundColor: tearColor }]} />
      <View pointerEvents="none" style={[styles.leftNick, tapeLeftNickStyles[variant], { backgroundColor: tearColor }]} />
      <View pointerEvents="none" style={[styles.rightNick, tapeRightNickStyles[variant], { backgroundColor: tearColor }]} />
    </>
  );
}

function theme(
  family: TapeFamily,
  backgroundColor: string,
  borderColor: string,
  grain: string,
  line: string,
  shadow: string,
): MaskingTapeTheme {
  return { backgroundColor, borderColor, family, grain, line, shadow };
}

function getPaperFamily(paperColor?: string): TapeFamily | undefined {
  if (!paperColor) {
    return undefined;
  }

  const color = paperColor.toLowerCase();

  if (color.includes('255, 241') || color.includes('255, 231') || color.includes('ffd') || color.includes('ffe')) {
    return 'yellow';
  }
  if (color.includes('246, 165') || color.includes('pink') || color.includes('f6a5') || color.includes('ffd8')) {
    return 'pink';
  }
  if (color.includes('183, 139') || color.includes('b78b') || color.includes('c95c')) {
    return 'purple';
  }
  if (color.includes('167, 234') || color.includes('e7f3') || color.includes('a7ea')) {
    return 'mint';
  }
  if (color.includes('190, 232') || color.includes('bee8') || color.includes('dded')) {
    return 'cyan';
  }
  if (color.includes('253, 178') || color.includes('ff8') || color.includes('fdb2')) {
    return 'orange';
  }
  if (color.includes('9dd') || color.includes('25d') || color.includes('a7e')) {
    return 'green';
  }

  return undefined;
}

function hashString(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

const styles = StyleSheet.create({
  fiberWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  brushBand: {
    position: 'absolute',
    left: 10,
    right: 10,
    opacity: 0.28,
  },
  brushBandTop: {
    top: 7,
    height: 8,
    transform: [{ rotate: '-0.5deg' }],
  },
  brushBandMiddle: {
    top: '45%',
    height: 7,
    opacity: 0.22,
    transform: [{ rotate: '0.35deg' }],
  },
  brushBandBottom: {
    bottom: 8,
    height: 6,
    opacity: 0.18,
    transform: [{ rotate: '-0.2deg' }],
  },
  crease: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: 2,
    opacity: 0.42,
  },
  softCrease: {
    position: 'absolute',
    top: 9,
    bottom: 7,
    width: 1,
    opacity: 0.75,
  },
  leftTear: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: -15,
    width: 28,
  },
  rightTear: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    right: -15,
    width: 28,
  },
  leftNick: {
    position: 'absolute',
    left: -4,
    width: 10,
    height: 8,
  },
  rightNick: {
    position: 'absolute',
    right: -4,
    width: 10,
    height: 8,
  },
});

const tapeFiberStyles: ViewStyle[] = [
  { opacity: 0.82 },
  { opacity: 0.92 },
  { opacity: 0.74 },
  { opacity: 0.86 },
  { opacity: 0.8 },
];

const tapeCreaseStyles: ViewStyle[] = [
  { left: '42%', transform: [{ rotate: '-11deg' }] },
  { left: '63%', transform: [{ rotate: '8deg' }] },
  { left: '28%', transform: [{ rotate: '-4deg' }] },
  { left: '74%', transform: [{ rotate: '12deg' }] },
  { left: '52%', transform: [{ rotate: '-16deg' }] },
];

const tapeSoftCreaseStyles: ViewStyle[] = [
  { left: '67%', transform: [{ rotate: '4deg' }] },
  { left: '34%', transform: [{ rotate: '-9deg' }] },
  { left: '80%', transform: [{ rotate: '11deg' }] },
  { left: '46%', transform: [{ rotate: '-5deg' }] },
  { left: '22%', transform: [{ rotate: '7deg' }] },
];

const tapeLeftTearStyles: ViewStyle[] = [
  { width: 27, transform: [{ rotate: '5deg' }] },
  { width: 20, transform: [{ rotate: '-8deg' }] },
  { width: 31, top: -12, transform: [{ rotate: '12deg' }] },
  { width: 22, bottom: -12, transform: [{ rotate: '-4deg' }] },
  { width: 18, transform: [{ rotate: '15deg' }] },
];

const tapeRightTearStyles: ViewStyle[] = [
  { width: 29, transform: [{ rotate: '-7deg' }] },
  { width: 21, top: -11, transform: [{ rotate: '9deg' }] },
  { width: 33, transform: [{ rotate: '-13deg' }] },
  { width: 17, bottom: -12, transform: [{ rotate: '5deg' }] },
  { width: 27, transform: [{ rotate: '-2deg' }] },
];

const tapeLeftNickStyles: ViewStyle[] = [
  { top: 6, transform: [{ rotate: '-13deg' }] },
  { bottom: 8, height: 11, transform: [{ rotate: '10deg' }] },
  { top: '42%', width: 8, transform: [{ rotate: '-7deg' }] },
  { top: 11, height: 13, transform: [{ rotate: '12deg' }] },
  { bottom: 10, width: 12, transform: [{ rotate: '-14deg' }] },
];

const tapeRightNickStyles: ViewStyle[] = [
  { bottom: 7, transform: [{ rotate: '14deg' }] },
  { top: 8, height: 11, transform: [{ rotate: '-11deg' }] },
  { top: '45%', width: 8, transform: [{ rotate: '8deg' }] },
  { bottom: 11, height: 13, transform: [{ rotate: '-13deg' }] },
  { top: 10, width: 12, transform: [{ rotate: '15deg' }] },
];
