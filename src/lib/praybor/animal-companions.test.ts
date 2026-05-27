import { describe, expect, it } from 'vitest';

import {
  countFruitBearingTrees,
  getNextSelectedAnimalCompanionIds,
  getUnlockedAnimalCompanions,
  normalizeSelectedAnimalCompanionIds,
  selectRoamingAnimalCompanions,
  toggleSelectedAnimalCompanionId,
  type AnimalCompanion,
} from './animal-companions';
import type { ActiveTree } from './domain';

describe('animal companion unlocks', () => {
  it('registers only the animals whose background work is ready', () => {
    expect(getUnlockedAnimalCompanions({
      activeTree: activeTreeWithGrowthPoints(0),
      completedTreeCount: 10,
    }).map((animal) => animal.id)).toEqual([
      'baby_rabbit',
      'desert_fox',
      'rock_hyrax',
      'lion',
      'sheep',
    ]);
  });

  it('keeps animals locked before the first tree bears fruit', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(5),
        completedTreeCount: 0,
      }),
    ).toEqual([]);
  });

  it('unlocks the baby rabbit when the first active tree starts bearing fruit', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(6),
        completedTreeCount: 0,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit']);
  });

  it('unlocks the desert fox when two trees have borne fruit', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(6),
        completedTreeCount: 1,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox']);

    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 2,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox']);
  });

  it('unlocks the rock hyrax when three trees have borne fruit', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 3,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox', 'rock_hyrax']);
  });

  it('unlocks the lion and sheep as later trees bear fruit', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 4,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion']);

    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 5,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep']);
  });

  it('unlocks every animal companion for admins regardless of tree progress', () => {
    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 0,
        isAdmin: true,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep']);
  });

  it('keeps the baby rabbit unlocked after the fruiting tree becomes a completed tree', () => {
    expect(
      countFruitBearingTrees({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 1,
      }),
    ).toBe(1);

    expect(
      getUnlockedAnimalCompanions({
        activeTree: activeTreeWithGrowthPoints(0),
        completedTreeCount: 1,
      }).map((animal) => animal.id),
    ).toEqual(['baby_rabbit']);
  });

  it('roams one animal until two kinds are unlocked, then caps roaming at two', () => {
    const animals: AnimalCompanion[] = [
      { id: 'baby_rabbit', label: 'Baby Rabbit', unlocksAtFruitBearingTreeCount: 1 },
      { id: 'dove', label: 'Dove', unlocksAtFruitBearingTreeCount: 2 },
      { id: 'lamb', label: 'Lamb', unlocksAtFruitBearingTreeCount: 3 },
    ];

    expect(selectRoamingAnimalCompanions({ unlockedCompanions: animals.slice(0, 1) }).map((animal) => animal.id)).toEqual([
      'baby_rabbit',
    ]);
    expect(
      selectRoamingAnimalCompanions({
        unlockedCompanions: animals,
        selectedCompanionIds: ['lamb', 'baby_rabbit'],
      }).map((animal) => animal.id),
    ).toEqual(['lamb', 'baby_rabbit']);
  });

  it('uses only selected animals for roaming when selection is explicit', () => {
    const animals: AnimalCompanion[] = [
      { id: 'baby_rabbit', label: 'Baby Rabbit', unlocksAtFruitBearingTreeCount: 1 },
      { id: 'desert_fox', label: 'Desert Fox', unlocksAtFruitBearingTreeCount: 2 },
      { id: 'lion', label: 'Lion', unlocksAtFruitBearingTreeCount: 3 },
    ];

    expect(
      selectRoamingAnimalCompanions({
        fillUnselected: false,
        unlockedCompanions: animals,
        selectedCompanionIds: ['lion'],
      }).map((animal) => animal.id),
    ).toEqual(['lion']);
  });

  it('normalizes selected animals against unlocked animals and fills default slots', () => {
    expect(
      normalizeSelectedAnimalCompanionIds({
        fillFromUnlocked: true,
        selectedCompanionIds: ['locked', 'baby_rabbit', 'baby_rabbit'],
        unlockedCompanionIds: ['baby_rabbit', 'desert_fox', 'lion'],
      }),
    ).toEqual(['baby_rabbit', 'desert_fox']);
  });

  it('auto-fills newly unlocked animals until the user manually edits selection', () => {
    expect(
      getNextSelectedAnimalCompanionIds({
        manuallySelected: false,
        selectedCompanionIds: ['baby_rabbit'],
        unlockedCompanionIds: ['baby_rabbit', 'desert_fox'],
      }),
    ).toEqual(['baby_rabbit', 'desert_fox']);

    expect(
      getNextSelectedAnimalCompanionIds({
        manuallySelected: true,
        selectedCompanionIds: ['desert_fox'],
        unlockedCompanionIds: ['baby_rabbit', 'desert_fox'],
      }),
    ).toEqual(['desert_fox']);
  });

  it('toggles animal selection while keeping at least one and at most two companions active', () => {
    const unlockedCompanionIds = ['baby_rabbit', 'desert_fox', 'lion'];

    expect(
      toggleSelectedAnimalCompanionId({
        companionId: 'desert_fox',
        selectedCompanionIds: ['baby_rabbit'],
        unlockedCompanionIds,
      }),
    ).toEqual(['baby_rabbit', 'desert_fox']);

    expect(
      toggleSelectedAnimalCompanionId({
        companionId: 'lion',
        selectedCompanionIds: ['baby_rabbit', 'desert_fox'],
        unlockedCompanionIds,
      }),
    ).toEqual(['baby_rabbit', 'desert_fox']);

    expect(
      toggleSelectedAnimalCompanionId({
        companionId: 'desert_fox',
        selectedCompanionIds: ['baby_rabbit', 'desert_fox'],
        unlockedCompanionIds,
      }),
    ).toEqual(['baby_rabbit']);

    expect(
      toggleSelectedAnimalCompanionId({
        companionId: 'baby_rabbit',
        selectedCompanionIds: ['baby_rabbit'],
        unlockedCompanionIds,
      }),
    ).toEqual(['baby_rabbit']);
  });
});

function activeTreeWithGrowthPoints(growthPoints: number): ActiveTree {
  return {
    id: `tree-${growthPoints}`,
    speciesId: 'apple',
    growthPoints,
    startedAt: '2026-05-19T12:00:00.000Z',
  };
}
