export function shouldTreatSceneAssetsAsReady({
  sceneAssetsReady,
  sceneHasRendered,
}: {
  sceneAssetsReady: boolean;
  sceneHasRendered: boolean;
}) {
  return sceneAssetsReady || sceneHasRendered;
}

export function shouldKeepOpenedOverlayMounted({
  hasOpened,
  isVisible,
}: {
  hasOpened: boolean;
  isVisible: boolean;
}) {
  return hasOpened || isVisible;
}

export function shouldWarmGrowOverlayAssets({
  growSceneContentReady,
  growSceneHasRendered,
}: {
  growSceneContentReady: boolean;
  growSceneHasRendered: boolean;
}) {
  return growSceneContentReady || growSceneHasRendered;
}

export function shouldRenderRoamingAnimals({
  currentAssetsReady,
  growPreferencesReady,
}: {
  currentAssetsReady: boolean;
  growPreferencesReady: boolean;
}) {
  return currentAssetsReady && growPreferencesReady;
}

export function shouldRenderForestRoamingAnimals({
  forestAnimalAssetsReady,
  forestSceneReady,
  forestVisible,
  growPreferencesReady,
}: {
  forestAnimalAssetsReady: boolean;
  forestSceneReady: boolean;
  forestVisible: boolean;
  growPreferencesReady: boolean;
}) {
  return forestVisible && forestSceneReady && forestAnimalAssetsReady && growPreferencesReady;
}

export function shouldRenderGrowSceneContent({
  adminStatusReady,
  completedTreeCountReady,
  currentAssetsReady,
  growPreferencesReady,
  treeSnapshotReady,
}: {
  adminStatusReady: boolean;
  completedTreeCountReady: boolean;
  currentAssetsReady: boolean;
  growPreferencesReady: boolean;
  treeSnapshotReady: boolean;
}) {
  return (
    adminStatusReady &&
    completedTreeCountReady &&
    currentAssetsReady &&
    growPreferencesReady &&
    treeSnapshotReady
  );
}
