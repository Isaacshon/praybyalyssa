import { describe, expect, it } from 'vitest';

import {
  GROW_MAP_AREA_DEFINITIONS,
  getGrowMapAreaSelectionStatus,
  isGrowMapAreaUnlocked,
} from './grow-map-areas';

describe('grow map areas', () => {
  it('adds only the finished map backgrounds to the map book', () => {
    expect(GROW_MAP_AREA_DEFINITIONS.map((area) => area.id)).toEqual([
      'forest-clearing',
      'prayer-field',
      'highland',
      'garden',
      'flower-garden',
      'night-sky',
    ]);
    expect(GROW_MAP_AREA_DEFINITIONS[2]).toMatchObject({
      sceneId: 'highland',
      guideImageId: 'highland',
      title: 'Highland',
      unlocksAtFruitBearingTreeCount: 2,
    });
    expect(GROW_MAP_AREA_DEFINITIONS[3]).toMatchObject({
      sceneId: 'garden',
      guideImageId: 'garden',
      title: 'Garden',
      unlocksAtFruitBearingTreeCount: 3,
    });
    expect(GROW_MAP_AREA_DEFINITIONS[4]).toMatchObject({
      sceneId: 'flowerGarden',
      guideImageId: 'flowerGarden',
      title: 'Flower Garden',
      unlocksAtFruitBearingTreeCount: 4,
    });
    expect(GROW_MAP_AREA_DEFINITIONS[5]).toMatchObject({
      sceneId: 'nightSky',
      guideImageId: 'nightSky',
      title: 'Night Sky',
      unlocksAtFruitBearingTreeCount: 5,
    });
  });

  it('unlocks highland after two trees have borne fruit', () => {
    const highland = GROW_MAP_AREA_DEFINITIONS.find((area) => area.id === 'highland');

    expect(highland).toBeTruthy();
    expect(isGrowMapAreaUnlocked({ area: highland!, fruitBearingTreeCount: 1 })).toBe(false);
    expect(isGrowMapAreaUnlocked({ area: highland!, fruitBearingTreeCount: 2 })).toBe(true);
  });

  it('unlocks every map for admins regardless of tree progress', () => {
    expect(
      GROW_MAP_AREA_DEFINITIONS.every((area) =>
        isGrowMapAreaUnlocked({
          area,
          fruitBearingTreeCount: 0,
          isAdmin: true,
        }),
      ),
    ).toBe(true);
  });

  it('marks only the active scene as the current map', () => {
    expect(
      getGrowMapAreaSelectionStatus({
        currentSceneId: 'forest',
        isUnlocked: true,
        sceneId: 'forest',
      }),
    ).toBe('current');
    expect(
      getGrowMapAreaSelectionStatus({
        currentSceneId: 'forest',
        isUnlocked: true,
        sceneId: 'highland',
      }),
    ).toBe('available');
    expect(
      getGrowMapAreaSelectionStatus({
        currentSceneId: 'forest',
        isUnlocked: false,
        sceneId: 'highland',
      }),
    ).toBe('locked');
  });
});
