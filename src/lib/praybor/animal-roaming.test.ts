import { describe, expect, it } from 'vitest';

import {
  ROAMING_ANIMAL_FACING_FRAME,
  getRoamingAnimalInitialDelayMs,
  getRoamingAnimalInitialStep,
  getRoamingAnimalIdleDelayMs,
  getRoamingAnimalMove,
  getRoamingAnimalMotionState,
  getRoamingAnimalNextRestWalkCount,
  getRoamingAnimalPoint,
  getRoamingAnimalPose,
  getRoamingAnimalTurnDelayMs,
  getRoamingAnimalWalkSpeedPxPerSecond,
  shouldRoamingAnimalRest,
} from './animal-roaming';

describe('animal roaming layout', () => {
  it('keeps roaming points inside the grow map scene bounds', () => {
    const sceneWidth = 390;
    const size = 84;

    for (let step = 0; step < 8; step += 1) {
      const point = getRoamingAnimalPoint({ index: 0, sceneWidth, size, step });

      expect(point.x).toBeGreaterThanOrEqual(18);
      expect(point.x + size).toBeLessThanOrEqual(sceneWidth - 18);
    }
  });

  it('keeps all roaming routes in the ground area under the tree', () => {
    const sceneWidth = 390;
    const size = 84;

    for (let index = 0; index < 5; index += 1) {
      for (let step = 0; step < 12; step += 1) {
        const point = getRoamingAnimalPoint({ index, sceneWidth, size, step });

        expect(point.y).toBeGreaterThanOrEqual(24);
        expect(point.y).toBeLessThanOrEqual(132);
      }
    }
  });

  it('gives the flipped-facing image wrapper a real frame to render GIFs', () => {
    expect(ROAMING_ANIMAL_FACING_FRAME).toEqual({
      width: '100%',
      height: '100%',
    });
  });

  it('uses walking speed to time movement instead of a fixed duration', () => {
    const shortMove = getRoamingAnimalMove({
      from: { x: 40, y: 0 },
      to: { x: 74, y: 0 },
    });
    const longMove = getRoamingAnimalMove({
      from: { x: 40, y: 0 },
      to: { x: 210, y: 72 },
    });

    expect(longMove.distance).toBeGreaterThan(shortMove.distance);
    expect(longMove.durationMs).toBeGreaterThan(shortMove.durationMs);
  });

  it('matches walking speed to the rendered animal size instead of fixed screen pixels', () => {
    const smallSpeed = getRoamingAnimalWalkSpeedPxPerSecond({ size: 72 });
    const largeSpeed = getRoamingAnimalWalkSpeedPxPerSecond({ size: 104 });

    expect(largeSpeed).toBeGreaterThan(smallSpeed);
    expect(largeSpeed / 104).toBeCloseTo(smallSpeed / 72, 3);
    expect(getRoamingAnimalMove({ from: { x: 40, y: 0 }, to: { x: 140, y: 0 }, size: 72 }).durationMs).toBeGreaterThan(
      getRoamingAnimalMove({ from: { x: 40, y: 0 }, to: { x: 140, y: 0 }, size: 104 }).durationMs,
    );
  });

  it('flips the left-facing side sprite toward the travel direction', () => {
    expect(
      getRoamingAnimalMove({
        from: { x: 120, y: 0 },
        to: { x: 60, y: 0 },
      }).directionScaleX,
    ).toBe(1);
    expect(
      getRoamingAnimalMove({
        from: { x: 60, y: 0 },
        to: { x: 120, y: 0 },
      }).directionScaleX,
    ).toBe(-1);
  });

  it('keeps right-facing source sprites pointed toward the travel direction', () => {
    expect(
      getRoamingAnimalMove({
        companionId: 'dog',
        from: { x: 60, y: 0 },
        to: { x: 120, y: 0 },
      }).directionScaleX,
    ).toBe(1);
    expect(
      getRoamingAnimalMove({
        companionId: 'dog',
        from: { x: 120, y: 0 },
        to: { x: 60, y: 0 },
      }).directionScaleX,
    ).toBe(-1);
  });

  it('moves naturally through horizontal and vertical map directions', () => {
    const sceneWidth = 390;
    const size = 84;
    const moves = Array.from({ length: 8 }, (_, step) =>
      getRoamingAnimalMove({
        from: getRoamingAnimalPoint({ index: 0, sceneWidth, size, step }),
        to: getRoamingAnimalPoint({ index: 0, sceneWidth, size, step: step + 1 }),
      }),
    );

    expect(moves.some((move) => move.deltaX > 0)).toBe(true);
    expect(moves.some((move) => move.deltaX < 0)).toBe(true);
    expect(moves.some((move) => move.deltaY > 0)).toBe(true);
    expect(moves.some((move) => move.deltaY < 0)).toBe(true);
  });

  it('keeps each route segment led by the side-facing head direction', () => {
    const sceneWidth = 390;
    const size = 84;
    const moves = [0, 1, 2, 3, 4].flatMap((index) =>
      Array.from({ length: 8 }, (_, step) =>
        getRoamingAnimalMove({
          from: getRoamingAnimalPoint({ index, sceneWidth, size, step }),
          to: getRoamingAnimalPoint({ index, sceneWidth, size, step: step + 1 }),
        }),
      ),
    );

    expect(moves.every((move) => Math.abs(move.deltaX) > Math.abs(move.deltaY))).toBe(true);
  });

  it('uses longer walking runs with visible diagonal roaming instead of a straight line', () => {
    const sceneWidth = 390;
    const size = 84;

    for (const index of [0, 1]) {
      const moves = Array.from({ length: 8 }, (_, step) =>
        getRoamingAnimalMove({
          from: getRoamingAnimalPoint({ index, sceneWidth, size, step }),
          to: getRoamingAnimalPoint({ index, sceneWidth, size, step: step + 1 }),
        }),
      );
      const directionRuns = moves.reduce<number[]>((runs, move) => {
        const direction = Math.sign(move.deltaX);
        const previousMove = moves[runs.reduce((sum, run) => sum + run, 0) - 1];
        const previousDirection = previousMove ? Math.sign(previousMove.deltaX) : direction;

        if (runs.length === 0 || previousDirection !== direction) {
          runs.push(1);
        } else {
          runs[runs.length - 1] += 1;
        }

        return runs;
      }, []);

      expect(Math.max(...directionRuns)).toBeGreaterThanOrEqual(4);
      expect(Math.max(...moves.map((move) => Math.abs(move.deltaY)))).toBeGreaterThanOrEqual(28);
      expect(moves.some((move) => Math.abs(move.deltaY) >= Math.abs(move.deltaX) * 0.35)).toBe(true);
      expect(moves.every((move) => Math.abs(move.deltaX) >= Math.abs(move.deltaY) * 0.55)).toBe(true);
    }
  });

  it('keeps simultaneous animal routes far enough apart to avoid stacking', () => {
    const sceneWidth = 390;
    const size = 84;
    const minimumCenterDistance = size * 0.85;

    for (let step = 0; step < 12; step += 1) {
      const first = getRoamingAnimalPoint({ index: 0, sceneWidth, size, step });
      const second = getRoamingAnimalPoint({ index: 1, sceneWidth, size, step });
      const centerDistance = Math.hypot(first.x - second.x, first.y - second.y);

      expect(centerDistance).toBeGreaterThanOrEqual(minimumCenterDistance);
    }
  });

  it('uses the front pose only while stopped', () => {
    expect(getRoamingAnimalPose({ walking: false })).toBe('idle');
    expect(getRoamingAnimalPose({ walking: true })).toBe('walking');
  });

  it('rests only after a long walking run with a varied next-rest count', () => {
    const nextRestCounts = [0, 1, 2, 3, 4].map((index) =>
      getRoamingAnimalNextRestWalkCount({ companionId: 'desert_fox', cycle: 0, index }),
    );
    const firstRestCount = nextRestCounts[0];

    expect(Math.min(...nextRestCounts)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...nextRestCounts)).toBeLessThanOrEqual(12);
    expect(new Set(nextRestCounts).size).toBeGreaterThan(1);
    expect(
      shouldRoamingAnimalRest({
        companionId: 'desert_fox',
        completedWalksSinceRest: firstRestCount - 1,
        cycle: 0,
        index: 0,
        step: firstRestCount,
      }),
    ).toBe(false);
    expect(
      shouldRoamingAnimalRest({
        companionId: 'desert_fox',
        completedWalksSinceRest: firstRestCount,
        cycle: 0,
        index: 0,
        step: firstRestCount + 1,
      }),
    ).toBe(true);
  });

  it('starts animals on different route phases and wake timings', () => {
    const indexes = [0, 1, 2, 3, 4];

    expect(new Set(indexes.map((index) => getRoamingAnimalInitialStep({ index }))).size).toBeGreaterThan(1);
    expect(new Set(indexes.map((index) => getRoamingAnimalInitialDelayMs({ index }))).size).toBeGreaterThan(1);
  });

  it('varies the next front-facing rest count by animal slot and cycle', () => {
    const firstCycleCounts = [0, 1, 2, 3, 4].map((index) =>
      getRoamingAnimalNextRestWalkCount({ companionId: 'dog', cycle: 0, index }),
    );
    const nextCycleCounts = [0, 1, 2, 3, 4].map((index) =>
      getRoamingAnimalNextRestWalkCount({ companionId: 'dog', cycle: 1, index }),
    );

    expect(new Set(firstCycleCounts).size).toBeGreaterThan(1);
    expect(nextCycleCounts).not.toEqual(firstCycleCounts);
  });

  it('uses a brief transition between walks and a longer delay for rare front-facing rests', () => {
    expect(getRoamingAnimalIdleDelayMs({ index: 0, resting: false, step: 1 })).toBe(0);
    expect(getRoamingAnimalIdleDelayMs({ index: 0, resting: true, step: 7 })).toBeGreaterThanOrEqual(6400);
    expect(getRoamingAnimalIdleDelayMs({ index: 1, resting: true, step: 9 })).toBeGreaterThanOrEqual(6400);
  });

  it('keeps translation continuous through face-forward frames that are still walking', () => {
    const samplesByCompanionId = {
      baby_rabbit: [0, 2500, 6500, 10020],
      dog: [1400, 2500, 6500, 9400],
      desert_fox: [900, 1200, 4100, 6500, 7900],
      rock_hyrax: [900, 1600, 5400],
      lion: [0, 1600, 5400, 6020],
      sheep: [0, 1600, 5400, 6020],
    };

    for (const [companionId, samples] of Object.entries(samplesByCompanionId)) {
      for (const elapsedMs of samples) {
        const motionState = getRoamingAnimalMotionState({ companionId, elapsedMs });

        expect(motionState.moving).toBe(true);
        expect(motionState.waitMs).toBe(0);
        expect(motionState.remainingMovingMs).toBeGreaterThan(0);
      }
    }
  });

  it('pauses translation only for true non-walking portions inside side-view GIFs', () => {
    expect(getRoamingAnimalMotionState({ companionId: 'dog', elapsedMs: 200 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'dog', elapsedMs: 1100 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'dog', elapsedMs: 9900 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'desert_fox', elapsedMs: 200 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'desert_fox', elapsedMs: 820 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'desert_fox', elapsedMs: 8100 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'desert_fox', elapsedMs: 8500 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'desert_fox', elapsedMs: 9900 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'rock_hyrax', elapsedMs: 500 }).moving).toBe(false);
    expect(getRoamingAnimalMotionState({ companionId: 'rock_hyrax', elapsedMs: 5800 }).moving).toBe(false);
  });

  it('keeps every current animal on the shared side-view roaming model', () => {
    for (const companionId of ['baby_rabbit', 'dog', 'desert_fox', 'rock_hyrax', 'lion', 'sheep']) {
      const speed = getRoamingAnimalWalkSpeedPxPerSecond({ companionId, size: 84 });
      const earlyState = getRoamingAnimalMotionState({ companionId, elapsedMs: 1600 });

      expect(speed).toBeGreaterThan(0);
      expect(typeof earlyState.moving).toBe('boolean');
      expect(earlyState.positionMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('waits briefly only when the animal changes walking direction', () => {
    expect(
      getRoamingAnimalTurnDelayMs({
        previousDirectionScaleX: -1,
        nextDirectionScaleX: -1,
        wasIdle: false,
      }),
    ).toBe(0);
    expect(
      getRoamingAnimalTurnDelayMs({
        previousDirectionScaleX: -1,
        nextDirectionScaleX: 1,
        wasIdle: false,
      }),
    ).toBeGreaterThanOrEqual(90);
    expect(
      getRoamingAnimalTurnDelayMs({
        previousDirectionScaleX: -1,
        nextDirectionScaleX: -1,
        wasIdle: true,
      }),
    ).toBeGreaterThanOrEqual(160);
  });
});
