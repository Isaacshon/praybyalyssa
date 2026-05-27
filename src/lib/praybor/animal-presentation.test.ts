import { describe, expect, it } from 'vitest';

import { getAnimalCompanionImageScale } from './animal-presentation';

describe('animal companion presentation', () => {
  it('keeps the baby rabbit as the baseline presentation size', () => {
    expect(getAnimalCompanionImageScale({ companionId: 'baby_rabbit', pose: 'walking' })).toBe(1);
    expect(getAnimalCompanionImageScale({ companionId: 'baby_rabbit', pose: 'idle' })).toBe(1);
  });

  it('normalizes the desert fox visual size across its wide side-view canvas and square idle canvas', () => {
    const walkingScale = getAnimalCompanionImageScale({ companionId: 'desert_fox', pose: 'walking' });
    const idleScale = getAnimalCompanionImageScale({ companionId: 'desert_fox', pose: 'idle' });

    expect(walkingScale).toBeCloseTo(1.18, 2);
    expect(idleScale).toBeCloseTo(1.04, 2);
    expect(walkingScale / idleScale).toBeLessThan(1.15);
  });

  it('falls back to the baseline scale for animals without a custom visual calibration', () => {
    for (const companionId of ['rock_hyrax', 'lion', 'sheep', 'unknown']) {
      expect(getAnimalCompanionImageScale({ companionId, pose: 'walking' })).toBe(1);
      expect(getAnimalCompanionImageScale({ companionId, pose: 'idle' })).toBe(1);
    }
  });
});
