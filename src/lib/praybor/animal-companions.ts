import { getGrowthStage, type ActiveTree } from './domain';

export type AnimalCompanion = {
  id: string;
  label: string;
  unlocksAtFruitBearingTreeCount: number;
};

export type AnimalUnlockProgress = {
  activeTree: ActiveTree | null;
  completedTreeCount?: number;
  isAdmin?: boolean;
};

export const ANIMAL_COMPANIONS: readonly AnimalCompanion[] = [
  {
    id: 'baby_rabbit',
    label: 'Baby Rabbit',
    unlocksAtFruitBearingTreeCount: 1,
  },
  {
    id: 'desert_fox',
    label: 'Desert Fox',
    unlocksAtFruitBearingTreeCount: 2,
  },
  {
    id: 'rock_hyrax',
    label: 'Rock Hyrax',
    unlocksAtFruitBearingTreeCount: 3,
  },
  {
    id: 'lion',
    label: 'Lion',
    unlocksAtFruitBearingTreeCount: 4,
  },
  {
    id: 'sheep',
    label: 'Sheep',
    unlocksAtFruitBearingTreeCount: 5,
  },
  {
    id: 'dog',
    label: 'Dog',
    unlocksAtFruitBearingTreeCount: 6,
  },
];

export function countFruitBearingTrees({
  activeTree,
  completedTreeCount = 0,
}: AnimalUnlockProgress) {
  const normalizedCompletedTreeCount = Math.max(0, Math.floor(completedTreeCount));
  const activeTreeStage = activeTree ? getGrowthStage(activeTree.growthPoints) : 'seed';
  const activeTreeHasFruit =
    activeTreeStage === 'fruiting_tree' || activeTreeStage === 'completed';

  return normalizedCompletedTreeCount + (activeTreeHasFruit ? 1 : 0);
}

export function getUnlockedAnimalCompanions(
  progress: AnimalUnlockProgress,
  companions: readonly AnimalCompanion[] = ANIMAL_COMPANIONS,
) {
  if (progress.isAdmin) {
    return [...companions];
  }

  const fruitBearingTreeCount = countFruitBearingTrees(progress);

  return companions.filter(
    (companion) =>
      fruitBearingTreeCount >= companion.unlocksAtFruitBearingTreeCount,
  );
}

export function selectRoamingAnimalCompanions({
  fillUnselected = true,
  maxRoamers = 2,
  selectedCompanionIds = [],
  unlockedCompanions,
}: {
  fillUnselected?: boolean;
  maxRoamers?: number;
  selectedCompanionIds?: string[];
  unlockedCompanions: readonly AnimalCompanion[];
}) {
  if (unlockedCompanions.length === 0 || maxRoamers <= 0) {
    return [];
  }

  const unlockedById = new Map(
    unlockedCompanions.map((companion) => [companion.id, companion]),
  );
  const orderedCompanions: AnimalCompanion[] = [];

  for (const companionId of selectedCompanionIds) {
    const companion = unlockedById.get(companionId);

    if (companion && !orderedCompanions.some((entry) => entry.id === companion.id)) {
      orderedCompanions.push(companion);
    }
  }

  if (fillUnselected) {
    for (const companion of unlockedCompanions) {
      if (!orderedCompanions.some((entry) => entry.id === companion.id)) {
        orderedCompanions.push(companion);
      }
    }
  }

  return orderedCompanions.slice(0, Math.min(maxRoamers, unlockedCompanions.length));
}

export function normalizeSelectedAnimalCompanionIds({
  fillFromUnlocked = false,
  maxSelected = 2,
  selectedCompanionIds,
  unlockedCompanionIds,
}: {
  fillFromUnlocked?: boolean;
  maxSelected?: number;
  selectedCompanionIds: readonly string[];
  unlockedCompanionIds: readonly string[];
}) {
  if (maxSelected <= 0 || unlockedCompanionIds.length === 0) {
    return [];
  }

  const unlockedIds = new Set(unlockedCompanionIds);
  const selectedIds: string[] = [];

  for (const companionId of selectedCompanionIds) {
    if (
      unlockedIds.has(companionId) &&
      !selectedIds.includes(companionId) &&
      selectedIds.length < maxSelected
    ) {
      selectedIds.push(companionId);
    }
  }

  if (fillFromUnlocked) {
    for (const companionId of unlockedCompanionIds) {
      if (!selectedIds.includes(companionId) && selectedIds.length < maxSelected) {
        selectedIds.push(companionId);
      }
    }
  }

  return selectedIds;
}

export function getNextSelectedAnimalCompanionIds({
  manuallySelected,
  maxSelected = 2,
  selectedCompanionIds,
  unlockedCompanionIds,
}: {
  manuallySelected: boolean;
  maxSelected?: number;
  selectedCompanionIds: readonly string[];
  unlockedCompanionIds: readonly string[];
}) {
  return normalizeSelectedAnimalCompanionIds({
    fillFromUnlocked: !manuallySelected,
    maxSelected,
    selectedCompanionIds,
    unlockedCompanionIds,
  });
}

export function toggleSelectedAnimalCompanionId({
  companionId,
  maxSelected = 2,
  selectedCompanionIds,
  unlockedCompanionIds,
}: {
  companionId: string;
  maxSelected?: number;
  selectedCompanionIds: readonly string[];
  unlockedCompanionIds: readonly string[];
}) {
  const normalizedSelectedIds = normalizeSelectedAnimalCompanionIds({
    maxSelected,
    selectedCompanionIds,
    unlockedCompanionIds,
  });

  if (!unlockedCompanionIds.includes(companionId)) {
    return normalizedSelectedIds;
  }

  if (normalizedSelectedIds.includes(companionId)) {
    return normalizedSelectedIds.length <= 1
      ? normalizedSelectedIds
      : normalizedSelectedIds.filter((selectedId) => selectedId !== companionId);
  }

  if (normalizedSelectedIds.length >= maxSelected) {
    return normalizedSelectedIds;
  }

  return [...normalizedSelectedIds, companionId];
}
