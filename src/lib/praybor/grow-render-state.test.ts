import { describe, expect, it } from 'vitest';

import {
  getForestDioramaBoardRecyclingKey,
  getNextForestDioramaRenderSessionKey,
  shouldKeepOpenedOverlayMounted,
  shouldWarmGrowOverlayAssets,
  shouldTreatSceneAssetsAsReady,
  shouldRenderGrowSceneContent,
  shouldRenderForestRoamingAnimals,
  shouldRenderRoamingAnimals,
} from './grow-render-state';

describe('grow screen render readiness', () => {
  it('does not render roaming animals before restored preferences choose the right animals', () => {
    expect(
      shouldRenderRoamingAnimals({
        currentAssetsReady: true,
        growPreferencesReady: false,
      }),
    ).toBe(false);
  });

  it('does not render roaming animals before their current GIF assets are warmed', () => {
    expect(
      shouldRenderRoamingAnimals({
        currentAssetsReady: false,
        growPreferencesReady: true,
      }),
    ).toBe(false);
  });

  it('only runs forest roaming animals while the mini forest is visible and warmed', () => {
    expect(
      shouldRenderForestRoamingAnimals({
        forestAnimalAssetsReady: true,
        forestSceneReady: true,
        forestVisible: false,
        growPreferencesReady: true,
      }),
    ).toBe(false);

    expect(
      shouldRenderForestRoamingAnimals({
        forestAnimalAssetsReady: false,
        forestSceneReady: true,
        forestVisible: true,
        growPreferencesReady: true,
      }),
    ).toBe(false);

    expect(
      shouldRenderForestRoamingAnimals({
        forestAnimalAssetsReady: true,
        forestSceneReady: true,
        forestVisible: true,
        growPreferencesReady: true,
      }),
    ).toBe(true);
  });

  it('renders the grow scene only after data and current image assets are ready', () => {
    expect(
      shouldRenderGrowSceneContent({
        adminStatusReady: true,
        completedTreeCountReady: true,
        currentAssetsReady: true,
        growPreferencesReady: true,
        treeSnapshotReady: true,
      }),
    ).toBe(true);

    expect(
      shouldRenderGrowSceneContent({
        adminStatusReady: true,
        completedTreeCountReady: true,
        currentAssetsReady: false,
        growPreferencesReady: true,
        treeSnapshotReady: true,
      }),
    ).toBe(false);
  });

  it('keeps the rendered grow scene visible while replacement assets warm up', () => {
    expect(
      shouldTreatSceneAssetsAsReady({
        sceneAssetsReady: false,
        sceneHasRendered: false,
      }),
    ).toBe(false);

    expect(
      shouldTreatSceneAssetsAsReady({
        sceneAssetsReady: false,
        sceneHasRendered: true,
      }),
    ).toBe(true);
  });

  it('keeps overlay content mounted after the first open so images do not remount every close', () => {
    expect(shouldKeepOpenedOverlayMounted({ hasOpened: false, isVisible: false })).toBe(false);
    expect(shouldKeepOpenedOverlayMounted({ hasOpened: false, isVisible: true })).toBe(true);
    expect(shouldKeepOpenedOverlayMounted({ hasOpened: true, isVisible: false })).toBe(true);
  });

  it('rotates the forest diorama board image key each time the forest opens', () => {
    const imageSignature = 'asset:forest-flat-grid';
    const firstOpenSessionKey = getNextForestDioramaRenderSessionKey(0);
    const secondOpenSessionKey = getNextForestDioramaRenderSessionKey(firstOpenSessionKey);

    expect(firstOpenSessionKey).toBe(1);
    expect(secondOpenSessionKey).toBe(2);
    expect(
      getForestDioramaBoardRecyclingKey({
        imageSignature,
        renderSessionKey: firstOpenSessionKey,
      }),
    ).not.toBe(
      getForestDioramaBoardRecyclingKey({
        imageSignature,
        renderSessionKey: secondOpenSessionKey,
      }),
    );
  });

  it('starts warming overlay assets as soon as the grow scene can render once', () => {
    expect(
      shouldWarmGrowOverlayAssets({
        growSceneContentReady: false,
        growSceneHasRendered: false,
      }),
    ).toBe(false);

    expect(
      shouldWarmGrowOverlayAssets({
        growSceneContentReady: true,
        growSceneHasRendered: false,
      }),
    ).toBe(true);

    expect(
      shouldWarmGrowOverlayAssets({
        growSceneContentReady: false,
        growSceneHasRendered: true,
      }),
    ).toBe(true);
  });
});
