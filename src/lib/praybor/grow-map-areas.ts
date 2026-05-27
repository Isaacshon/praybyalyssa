export const GROW_MAP_AREA_DEFINITIONS = [
  {
    id: 'forest-clearing',
    sceneId: 'forest',
    guideImageId: 'forest',
    title: 'Forest',
    subtitle: 'Current seed home',
    unlocksAtFruitBearingTreeCount: 0,
  },
  {
    id: 'prayer-field',
    sceneId: 'wilderness',
    guideImageId: 'wilderness',
    title: 'Prayer Field',
    subtitle: 'Public prayers grow here',
    unlocksAtFruitBearingTreeCount: 1,
  },
  {
    id: 'highland',
    sceneId: 'highland',
    guideImageId: 'highland',
    title: 'Highland',
    subtitle: 'A quiet plateau for faithful growth',
    unlocksAtFruitBearingTreeCount: 2,
  },
  {
    id: 'garden',
    sceneId: 'garden',
    guideImageId: 'garden',
    title: 'Garden',
    subtitle: 'A soft garden for resting prayers',
    unlocksAtFruitBearingTreeCount: 3,
  },
  {
    id: 'flower-garden',
    sceneId: 'flowerGarden',
    guideImageId: 'flowerGarden',
    title: 'Flower Garden',
    subtitle: 'A bright field where answered prayers bloom',
    unlocksAtFruitBearingTreeCount: 4,
  },
  {
    id: 'night-sky',
    sceneId: 'nightSky',
    guideImageId: 'nightSky',
    title: 'Night Sky',
    subtitle: 'A moonlit meadow under sparkling stars',
    unlocksAtFruitBearingTreeCount: 5,
  },
] as const;

export type GrowMapAreaDefinition = (typeof GROW_MAP_AREA_DEFINITIONS)[number];
export type GrowMapAreaSelectionStatus = 'available' | 'current' | 'locked';

export function isGrowMapAreaUnlocked({
  area,
  fruitBearingTreeCount,
  isAdmin = false,
}: {
  area: GrowMapAreaDefinition;
  fruitBearingTreeCount: number;
  isAdmin?: boolean;
}) {
  if (isAdmin) {
    return true;
  }

  return fruitBearingTreeCount >= area.unlocksAtFruitBearingTreeCount;
}

export function getGrowMapAreaSelectionStatus({
  currentSceneId,
  isUnlocked,
  sceneId,
}: {
  currentSceneId: string;
  isUnlocked: boolean;
  sceneId: string;
}): GrowMapAreaSelectionStatus {
  if (!isUnlocked) {
    return 'locked';
  }

  return sceneId === currentSceneId ? 'current' : 'available';
}
