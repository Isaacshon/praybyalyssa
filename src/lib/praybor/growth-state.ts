import type { ActiveTree, PrayerVisibility, TreeGrowthEventType } from './domain';
import {
  fetchPersistedActiveTree,
  recordPersistedTreeGrowthAction,
  updatePersistedTreeGrowthAsAdmin,
} from './tree-growth-persistence';

const growthSubscribers = new Set<(tree: ActiveTree | null) => void>();
let currentTree: ActiveTree | null = null;
let hasRequestedServerTree = false;

export function getActiveTreeSnapshot() {
  return currentTree;
}

export function subscribeToActiveTree(listener: (tree: ActiveTree | null) => void) {
  growthSubscribers.add(listener);
  listener(currentTree);

  if (!hasRequestedServerTree) {
    hasRequestedServerTree = true;
    void refreshActiveTreeSnapshot();
  }

  return () => {
    growthSubscribers.delete(listener);
  };
}

export async function refreshActiveTreeSnapshot() {
  const persistedTree = await fetchPersistedActiveTree();

  if (persistedTree) {
    currentTree = persistedTree;
    notifyGrowthSubscribers();
  }

  return currentTree;
}

export function recordTreeGrowthAction(
  type: TreeGrowthEventType,
  visibility: PrayerVisibility,
  occurredOn = new Date().toISOString().slice(0, 10),
  sourcePrayerId?: string,
) {
  void recordPersistedTreeGrowthAction({
    type,
    visibility,
    occurredOn,
    sourcePrayerId,
  }).then((persistedTree) => {
    if (persistedTree) {
      currentTree = persistedTree;
      notifyGrowthSubscribers();
    }
  });

  return currentTree;
}

export async function updateTreeGrowthAsAdmin(growthPoints: number) {
  if (!currentTree) {
    throw new Error('No active tree is available to update yet.');
  }

  const persistedTree = await updatePersistedTreeGrowthAsAdmin({
    growthPoints,
    treeId: currentTree.id,
  });

  if (persistedTree) {
    currentTree = persistedTree;
    notifyGrowthSubscribers();
  }

  return currentTree;
}

function notifyGrowthSubscribers() {
  for (const subscriber of growthSubscribers) {
    subscriber(currentTree);
  }
}
