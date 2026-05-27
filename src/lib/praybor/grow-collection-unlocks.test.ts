import { describe, expect, it } from 'vitest';

import { isTreeSpeciesUnlocked } from './grow-collection-unlocks';

describe('grow collection unlocks', () => {
  it('keeps other tree species locked for regular users', () => {
    expect(
      isTreeSpeciesUnlocked({
        speciesId: 'cedar',
        activeSpeciesId: 'apple',
        hasFruitingTree: true,
      }),
    ).toBe(false);
  });

  it('unlocks every tree species for admins regardless of tree progress', () => {
    expect(
      isTreeSpeciesUnlocked({
        speciesId: 'cedar',
        activeSpeciesId: 'apple',
        hasFruitingTree: false,
        isAdmin: true,
      }),
    ).toBe(true);
  });
});
