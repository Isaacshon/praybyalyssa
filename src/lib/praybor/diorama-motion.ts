import { FOREST_DIORAMA_SLOTS } from './diorama-layout';

export type ForestDioramaBackgroundMotionLayer = {
  delayMs: number;
  durationMs: number;
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
};

export type ForestDioramaTreeMotion = {
  delayMs: number;
  direction: -1 | 1;
  durationMs: number;
  rotateDeg: number;
  translateX: number;
  translateY: number;
};

export const FOREST_DIORAMA_TREES_PER_THEME = FOREST_DIORAMA_SLOTS.length;

export const FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS = [
  {
    delayMs: 0,
    durationMs: 12400,
    opacity: 0.2,
    scale: 1.018,
    translateX: 8,
    translateY: -5,
  },
  {
    delayMs: 760,
    durationMs: 15100,
    opacity: 0.16,
    scale: 1.026,
    translateX: -11,
    translateY: 7,
  },
  {
    delayMs: 1480,
    durationMs: 17800,
    opacity: 0.13,
    scale: 1.012,
    translateX: 5,
    translateY: 10,
  },
] as const satisfies readonly ForestDioramaBackgroundMotionLayer[];

const FOREST_DIORAMA_SHARED_TREE_MOTION = {
  delayMs: 0,
  durationMs: 4600,
  direction: 1,
  rotateDeg: 2.25,
  translateX: 2.35,
  translateY: 0.72,
} as const satisfies ForestDioramaTreeMotion;

export function getForestDioramaTreeMotion({ slotIndex: _slotIndex }: { slotIndex: number }) {
  return FOREST_DIORAMA_SHARED_TREE_MOTION;
}

export function getNextForestDioramaThemeIndex({
  currentIndex,
  themeCount,
}: {
  currentIndex: number;
  themeCount: number;
}) {
  if (themeCount <= 0 || currentIndex < 0) {
    return 0;
  }

  return (currentIndex + 1) % themeCount;
}

export function getForestDioramaThemeUnlockState({
  completedTreeCount,
  isAdmin = false,
  themeIndex,
}: {
  completedTreeCount: number;
  isAdmin?: boolean;
  themeIndex: number;
}) {
  const requiredCompletedTreeCount = Math.max(0, themeIndex) * FOREST_DIORAMA_TREES_PER_THEME;

  return {
    requiredCompletedTreeCount,
    unlocked: isAdmin || completedTreeCount >= requiredCompletedTreeCount,
  };
}

export function getForestDioramaThemeTreeWindow({
  completedTreeCount,
  isAdmin = false,
  themeIndex,
}: {
  completedTreeCount: number;
  isAdmin?: boolean;
  themeIndex: number;
}) {
  const startIndex = Math.max(0, themeIndex) * FOREST_DIORAMA_TREES_PER_THEME;
  const remainingTreeCount = Math.max(0, Math.floor(completedTreeCount) - startIndex);

  return {
    startIndex,
    treeCount: isAdmin
      ? FOREST_DIORAMA_TREES_PER_THEME
      : Math.min(FOREST_DIORAMA_TREES_PER_THEME, remainingTreeCount),
  };
}
