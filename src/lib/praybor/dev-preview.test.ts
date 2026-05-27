import { describe, expect, it } from 'vitest';

import {
  getBlessieGrowPreviewCompletedTreeCount,
  getBlessieGrowPreviewTree,
  isBlessieGrowPreviewEnabled,
} from './dev-preview';

describe('Blessie local grow preview', () => {
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
