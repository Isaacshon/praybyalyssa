import type { ActiveTree, PrayerVisibility, TreeGrowthEventType } from './domain';
import {
  fetchPersistedActiveTree,
  recordPersistedTreeGrowthAction,
  updatePersistedTreeGrowthAsAdmin,
} from './tree-growth-persistence';

export type ActiveTreeSnapshotSource = 'memory' | 'server';

const growthSubscribers = new Set<(
  tree: ActiveTree | null,
  source: ActiveTreeSnapshotSource,
) => void>();
let currentTree: ActiveTree | null = null;
let hasRequestedServerTree = false;
let hasLoadedServerTree = false;

export function getActiveTreeSnapshot() {
  return currentTree;
}

export function subscribeToActiveTree(
  listener: (
    tree: ActiveTree | null,
    source: ActiveTreeSnapshotSource,
  ) => void,
) {
  growthSubscribers.add(listener);
  listener(currentTree, hasLoadedServerTree ? 'server' : 'memory');

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
  }

  hasLoadedServerTree = true;
  notifyGrowthSubscribers('server');

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
      notifyGrowthSubscribers('server');
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
    notifyGrowthSubscribers('server');
  }

  return currentTree;
}

function notifyGrowthSubscribers(source: ActiveTreeSnapshotSource) {
  for (const subscriber of growthSubscribers) {
    subscriber(currentTree, source);
  }
}
