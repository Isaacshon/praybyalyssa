import { describe, expect, it } from 'vitest';

import {
  getBlessieGrowPreviewCompletedTreeCount,
  getBlessieGrowPreviewTree,
  isBlessieGrowPreviewEnabled,
} from './dev-preview';

describe('Blessie local grow preview', () => {
  it('does not read window.location.search in production native builds', () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });

    try {
      expect(
        isBlessieGrowPreviewEnabled({
          nodeEnv: 'production',
        }),
      ).toBe(false);
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
    }
  });

  it('enables the grow preview only outside production with the explicit query flag', () => {
    expect(
      isBlessieGrowPreviewEnabled({
        nodeEnv: 'development',
        search: '?blessieGrowPreview=animal',
      }),
    ).toBe(true);

    expect(
      isBlessieGrowPreviewEnabled({
        nodeEnv: 'production',
        search: '?blessieGrowPreview=animal',
      }),
    ).toBe(false);

    expect(
      isBlessieGrowPreviewEnabled({
        nodeEnv: 'development',
        search: '',
      }),
    ).toBe(false);
  });

  it('provides a fruiting tree so the baby rabbit unlocks in local preview', () => {
    expect(
      getBlessieGrowPreviewTree({
        nodeEnv: 'development',
        search: '?blessieGrowPreview=animal',
      }),
    ).toMatchObject({
      speciesId: 'apple',
      growthPoints: 6,
    });
  });

  it('includes one completed tree in local preview so the second animal can be inspected', () => {
    expect(
      getBlessieGrowPreviewCompletedTreeCount({
        nodeEnv: 'development',
        search: '?blessieGrowPreview=animal',
      }),
    ).toBe(1);

    expect(
      getBlessieGrowPreviewCompletedTreeCount({
        nodeEnv: 'production',
        search: '?blessieGrowPreview=animal',
      }),
    ).toBe(0);
  });
});
