import { describe, expect, it } from 'vitest';

import { FOREST_DIORAMA_SLOTS } from './diorama-layout';
import {
  FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS,
  FOREST_DIORAMA_TREES_PER_THEME,
  getForestDioramaThemeUnlockState,
  getForestDioramaThemeTreeWindow,
  getForestDioramaTreeMotion,
  getNextForestDioramaThemeIndex,
} from './diorama-motion';

describe('forest diorama motion', () => {
  it('uses multiple background motion layers with subtle, staggered drift', () => {
    expect(FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS.length).toBeGreaterThanOrEqual(3);

    const durations = new Set(
      FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS.map((layer) => layer.durationMs),
    );

    expect(durations.size).toBe(FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS.length);

    for (const layer of FOREST_DIORAMA_BACKGROUND_MOTION_LAYERS) {
      expect(Math.abs(layer.translateX)).toBeLessThanOrEqual(14);
      expect(Math.abs(layer.translateY)).toBeLessThanOrEqual(12);
      expect(layer.scale).toBeGreaterThanOrEqual(1);
      expect(layer.scale).toBeLessThanOrEqual(1.04);
    }
  });

  it('uses one shared tree wind rhythm so the forest sways together', () => {
    const firstTenSlots = Array.from({ length: 10 }, (_, slotIndex) =>
      getForestDioramaTreeMotion({ slotIndex }),
    );
    const uniqueRhythms = new Set(
      firstTenSlots.map((motion) => `${motion.durationMs}:${motion.delayMs}:${motion.direction}`),
    );

    expect(uniqueRhythms.size).toBe(1);

    for (const motion of firstTenSlots) {
      expect(motion.rotateDeg).toBeGreaterThanOrEqual(0.7);
      expect(motion.rotateDeg).toBeLessThanOrEqual(2.4);
      expect(motion.translateX).toBeGreaterThanOrEqual(0.6);
      expect(motion.translateX).toBeLessThanOrEqual(2.8);
      expect(motion.durationMs).toBeGreaterThanOrEqual(4200);
      expect(motion.durationMs).toBeLessThanOrEqual(7600);
      expect(motion.delayMs).toBe(0);
    }
  });

  it('wraps diorama theme changes in both directions', () => {
    expect(getNextForestDioramaThemeIndex({ currentIndex: 0, themeCount: 3 })).toBe(1);
    expect(getNextForestDioramaThemeIndex({ currentIndex: 2, themeCount: 3 })).toBe(0);
    expect(getNextForestDioramaThemeIndex({ currentIndex: -1, themeCount: 3 })).toBe(0);
    expect(getNextForestDioramaThemeIndex({ currentIndex: 0, themeCount: 0 })).toBe(0);
  });

  it('unlocks one diorama theme per filled grid forest', () => {
    expect(FOREST_DIORAMA_TREES_PER_THEME).toBe(FOREST_DIORAMA_SLOTS.length);
    expect(FOREST_DIORAMA_TREES_PER_THEME).toBeGreaterThan(20);
    expect(getForestDioramaThemeUnlockState({ completedTreeCount: 0, isAdmin: false, themeIndex: 0 })).toEqual({
      requiredCompletedTreeCount: 0,
      unlocked: true,
    });
    expect(
      getForestDioramaThemeUnlockState({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME - 1,
        isAdmin: false,
        themeIndex: 1,
      }),
    ).toEqual({
      requiredCompletedTreeCount: FOREST_DIORAMA_TREES_PER_THEME,
      unlocked: false,
    });
    expect(
      getForestDioramaThemeUnlockState({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME,
        isAdmin: false,
        themeIndex: 1,
      }),
    ).toEqual({
      requiredCompletedTreeCount: FOREST_DIORAMA_TREES_PER_THEME,
      unlocked: true,
    });
    expect(
      getForestDioramaThemeUnlockState({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME * 2,
        isAdmin: false,
        themeIndex: 2,
      }),
    ).toEqual({
      requiredCompletedTreeCount: FOREST_DIORAMA_TREES_PER_THEME * 2,
      unlocked: true,
    });
    expect(getForestDioramaThemeUnlockState({ completedTreeCount: 0, isAdmin: true, themeIndex: 2 }).unlocked).toBe(
      true,
    );
  });

  it('fills each diorama theme from the fruit-bearing tree count in grid pages', () => {
    expect(
      getForestDioramaThemeTreeWindow({
        completedTreeCount: 1,
        isAdmin: false,
        themeIndex: 0,
      }),
    ).toEqual({
      startIndex: 0,
      treeCount: 1,
    });
    expect(
      getForestDioramaThemeTreeWindow({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME,
        isAdmin: false,
        themeIndex: 0,
      }),
    ).toEqual({
      startIndex: 0,
      treeCount: FOREST_DIORAMA_TREES_PER_THEME,
    });
    expect(
      getForestDioramaThemeTreeWindow({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME,
        isAdmin: false,
        themeIndex: 1,
      }),
    ).toEqual({
      startIndex: FOREST_DIORAMA_TREES_PER_THEME,
      treeCount: 0,
    });
    expect(
      getForestDioramaThemeTreeWindow({
        completedTreeCount: FOREST_DIORAMA_TREES_PER_THEME + 3,
        isAdmin: false,
        themeIndex: 1,
      }),
    ).toEqual({
      startIndex: FOREST_DIORAMA_TREES_PER_THEME,
      treeCount: 3,
    });
    expect(
      getForestDioramaThemeTreeWindow({
        completedTreeCount: 0,
        isAdmin: true,
        themeIndex: 2,
      }),
    ).toEqual({
      startIndex: FOREST_DIORAMA_TREES_PER_THEME * 2,
      treeCount: FOREST_DIORAMA_TREES_PER_THEME,
    });
  });
});
