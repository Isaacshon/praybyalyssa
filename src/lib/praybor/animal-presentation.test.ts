import { describe, expect, it } from 'vitest';

import {
  getAnimalCompanionImageFrameScaleX,
  getAnimalCompanionImageScale,
  getAnimalCompanionPoseLoopDurationMs,
  getAnimalCompanionPoseSwitchDelayMs,
} from './animal-presentation';

describe('animal companion presentation', () => {
  it('keeps the baby rabbit as the baseline presentation size', () => {
    expect(getAnimalCompanionImageScale({ companionId: 'baby_rabbit', pose: 'walking' })).toBe(1);
    expect(getAnimalCompanionImageScale({ companionId: 'baby_rabbit', pose: 'idle' })).toBe(1);
    expect(getAnimalCompanionImageFrameScaleX({ companionId: 'baby_rabbit', pose: 'walking' })).toBe(1);
    expect(getAnimalCompanionImageFrameScaleX({ companionId: 'baby_rabbit', pose: 'idle' })).toBe(1);
  });

  it('normalizes the desert fox side-view canvas while keeping pose scale fixed', () => {
    const walkingScale = getAnimalCompanionImageScale({ companionId: 'desert_fox', pose: 'walking' });
    const idleScale = getAnimalCompanionImageScale({ companionId: 'desert_fox', pose: 'idle' });
    const walkingFrameScaleX = getAnimalCompanionImageFrameScaleX({
      companionId: 'desert_fox',
      pose: 'walking',
    });

    expect(walkingFrameScaleX).toBeCloseTo(16 / 9, 2);
    expect(walkingScale).toBe(1);
    expect(idleScale).toBe(1);
  });

  it('falls back to the baseline scale for animals without a custom visual calibration', () => {
    for (const companionId of ['rock_hyrax', 'lion', 'sheep', 'unknown']) {
      expect(getAnimalCompanionImageScale({ companionId, pose: 'walking' })).toBe(1);
      expect(getAnimalCompanionImageScale({ companionId, pose: 'idle' })).toBe(1);
      expect(getAnimalCompanionImageFrameScaleX({ companionId, pose: 'walking' })).toBe(1);
      expect(getAnimalCompanionImageFrameScaleX({ companionId, pose: 'idle' })).toBe(1);
    }
  });

  it('tracks pose animation loop lengths so view changes can wait for a clean boundary', () => {
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'baby_rabbit', pose: 'walking' })).toBe(10030);
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'dog', pose: 'walking' })).toBe(10030);
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'dog', pose: 'idle' })).toBe(10030);
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'desert_fox', pose: 'walking' })).toBe(10000);
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'desert_fox', pose: 'idle' })).toBe(6030);
    expect(getAnimalCompanionPoseLoopDurationMs({ companionId: 'unknown', pose: 'walking' })).toBe(6030);
  });

  it('switches poses immediately so stopped animals do not keep walking in place', () => {
    expect(
      getAnimalCompanionPoseSwitchDelayMs({
        companionId: 'desert_fox',
        currentPose: 'walking',
        elapsedMs: 2500,
      }),
    ).toBe(0);
    expect(
      getAnimalCompanionPoseSwitchDelayMs({
        companionId: 'desert_fox',
        currentPose: 'walking',
        elapsedMs: 10000,
      }),
    ).toBe(0);
    expect(
      getAnimalCompanionPoseSwitchDelayMs({
        companionId: 'baby_rabbit',
        currentPose: 'idle',
        elapsedMs: 6040,
      }),
    ).toBe(0);
    expect(
      getAnimalCompanionPoseSwitchDelayMs({
        companionId: 'baby_rabbit',
        currentPose: 'idle',
        elapsedMs: 1200,
        reduceMotion: true,
      }),
    ).toBe(0);
  });
});
