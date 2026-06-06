import { describe, expect, it } from 'vitest';

import {
  FOREST_DIORAMA_BOARD_HEIGHT,
  FOREST_DIORAMA_BOARD_WIDTH,
  FOREST_DIORAMA_SLOTS,
  getForestDioramaSlotAnchor,
} from './diorama-layout';
import {
  ROAMING_ANIMAL_FACING_FRAME,
  getRoamingAnimalActiveMotionDurationMs,
  getRoamingAnimalInitialDelayMs,
  getRoamingAnimalInitialStep,
  getRoamingAnimalIdleDelayMs,
  getRoamingAnimalLayerOffsetY,
  getRoamingAnimalMove,
  getRoamingAnimalMovementProgress,
  getRoamingAnimalMotionChunkDurationMs,
  getRoamingAnimalMotionProfile,
  getRoamingAnimalMotionState,
  getRoamingAnimalNextRestWalkCount,
  getRoamingAnimalPoint,
  getRoamingAnimalPose,
  getRoamingAnimalTurnDelayMs,
  getRoamingAnimalWalkSpeedPxPerSecond,
  shouldRoamingAnimalRest,
} from './animal-roaming';

const EXPECTED_ROAMING_MOTION_PROFILES = {
  baby_rabbit: {
    loopDurationMs: 10030,
    movingWindows: [{ startMs: 670, endMs: 10030 }],
    activeDurationMs: 9360,
    movingSamples: [670, 800, 2500, 6500, 10020],
    stoppedSamples: [0, 270, 529, 669],
  },
  dog: {
    loopDurationMs: 10030,
    movingWindows: [{ startMs: 1070, endMs: 9730 }],
    activeDurationMs: 8660,
    movingSamples: [1070, 1200, 1430, 2500, 6500, 9729],
    stoppedSamples: [0, 500, 1069, 9730, 9800, 9900, 10000],
  },
  desert_fox: {
    loopDurationMs: 10000,
    movingWindows: [{ startMs: 600, endMs: 7930 }],
    activeDurationMs: 7330,
    movingSamples: [600, 900, 1500, 2500, 3900, 4500, 5400, 6500, 7799],
    stoppedSamples: [0, 300, 599, 7930, 8000, 8400, 9000, 9900],
  },
  rock_hyrax: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 1000, endMs: 5330 }],
    activeDurationMs: 4330,
    movingSamples: [1000, 1100, 1600, 4200, 5329],
    stoppedSamples: [0, 500, 999, 5330, 5600, 5630, 5800, 6000],
  },
  lion: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 0, endMs: 6030 }],
    activeDurationMs: 6030,
    movingSamples: [0, 1600, 5400, 6029],
    stoppedSamples: [],
  },
  sheep: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 0, endMs: 6030 }],
    activeDurationMs: 6030,
    movingSamples: [0, 1600, 5400, 6029],
    stoppedSamples: [],
  },
} as const;

function mapRenderedForestPointToBoardSpace({
  renderedBoardHeight,
  renderedBoardWidth,
  x,
  y,
}: {
  renderedBoardHeight: number;
  renderedBoardWidth: number;
  x: number;
  y: number;
}) {
  const boardScale = Math.max(
    renderedBoardWidth / FOREST_DIORAMA_BOARD_WIDTH,
    renderedBoardHeight / FOREST_DIORAMA_BOARD_HEIGHT,
  );
  const drawnBoardWidth = FOREST_DIORAMA_BOARD_WIDTH * boardScale;
  const drawnBoardHeight = FOREST_DIORAMA_BOARD_HEIGHT * boardScale;
  const coverOffsetX = (renderedBoardWidth - drawnBoardWidth) / 2;
  const coverOffsetY = (renderedBoardHeight - drawnBoardHeight) / 2;

  return {
    x: (x - coverOffsetX) / boardScale,
    y: (y - coverOffsetY) / boardScale,
  };
}

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

  it('lets forest animals roam across the full forest map area', () => {
    const sceneWidth = 461;
    const sceneHeight = 996;
    const size = 34;
    const points = [0, 1, 2, 3, 4, 5].flatMap((index) =>
      Array.from({ length: 24 }, (_, step) =>
        getRoamingAnimalPoint({
          area: 'forest',
          companionId: ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'][index],
          index,
          sceneHeight,
          sceneWidth,
          size,
          step,
        }),
      ),
    );

    expect(Math.min(...points.map((point) => point.x))).toBeLessThan(sceneWidth * 0.24);
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(sceneWidth * 0.76);
    expect(Math.min(...points.map((point) => point.y))).toBeLessThan(sceneHeight * 0.24);
    expect(Math.max(...points.map((point) => point.y))).toBeGreaterThan(sceneHeight * 0.76);

    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(10);
      expect(point.x + size).toBeLessThanOrEqual(sceneWidth - 10);
      expect(point.y).toBeGreaterThanOrEqual(58);
      expect(point.y + size).toBeLessThanOrEqual(sceneHeight - 58);
    }
  });

  it('keeps forest animal foot positions out of tree planting roots', () => {
    const sceneWidth = 461;
    const sceneHeight = 996;
    const size = 34;
    const minimumTreeRootDistance = 52;
    const treeRoots = FOREST_DIORAMA_SLOTS.map(getForestDioramaSlotAnchor);

    for (let index = 0; index < 6; index += 1) {
      for (let step = 0; step < 36; step += 1) {
        const point = getRoamingAnimalPoint({
          area: 'forest',
          companionId: ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'][index],
          index,
          sceneHeight,
          sceneWidth,
          size,
          step,
        });
        const footPoint = mapRenderedForestPointToBoardSpace({
          renderedBoardHeight: sceneHeight,
          renderedBoardWidth: sceneWidth,
          x: point.x + size / 2,
          y: point.y + size * 0.7,
        });
        const nearestTreeDistance = Math.min(
          ...treeRoots.map((root) => Math.hypot(footPoint.x - root.x, footPoint.y - root.y)),
        );

        expect(nearestTreeDistance).toBeGreaterThanOrEqual(minimumTreeRootDistance);
      }
    }
  });

  it('keeps forest animal walking paths out of tree planting roots between route points', () => {
    const sceneWidth = 461;
    const sceneHeight = 996;
    const size = 34;
    const minimumTreeRootDistance = 52;
    const treeRoots = FOREST_DIORAMA_SLOTS.map(getForestDioramaSlotAnchor);

    for (let index = 0; index < 6; index += 1) {
      for (let step = 0; step < 36; step += 1) {
        const from = getRoamingAnimalPoint({
          area: 'forest',
          companionId: ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'][index],
          index,
          sceneHeight,
          sceneWidth,
          size,
          step,
        });
        const to = getRoamingAnimalPoint({
          area: 'forest',
          companionId: ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'][index],
          index,
          sceneHeight,
          sceneWidth,
          size,
          step: step + 1,
        });

        for (let sample = 0; sample <= 8; sample += 1) {
          const progress = sample / 8;
          const point = {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
          };
          const footPoint = mapRenderedForestPointToBoardSpace({
            renderedBoardHeight: sceneHeight,
            renderedBoardWidth: sceneWidth,
            x: point.x + size / 2,
            y: point.y + size * 0.7,
          });
          const nearestTreeDistance = Math.min(
            ...treeRoots.map((root) => Math.hypot(footPoint.x - root.x, footPoint.y - root.y)),
          );

          expect(nearestTreeDistance).toBeGreaterThanOrEqual(minimumTreeRootDistance);
        }
      }
    }
  });

  it('varies a companion route between full loops without leaving the roaming band', () => {
    const sceneWidth = 390;
    const size = 84;
    const firstLoop = Array.from({ length: 12 }, (_, step) =>
      getRoamingAnimalPoint({ companionId: 'desert_fox', index: 1, sceneWidth, size, step }),
    );
    const secondLoop = Array.from({ length: 12 }, (_, step) =>
      getRoamingAnimalPoint({ companionId: 'desert_fox', index: 1, sceneWidth, size, step: step + 12 }),
    );

    expect(
      secondLoop.some((point, index) => point.x !== firstLoop[index].x || point.y !== firstLoop[index].y),
    ).toBe(true);

    for (const point of [...firstLoop, ...secondLoop]) {
      expect(point.x).toBeGreaterThanOrEqual(18);
      expect(point.x + size).toBeLessThanOrEqual(sceneWidth - 18);
      expect(point.y).toBeGreaterThanOrEqual(24);
      expect(point.y).toBeLessThanOrEqual(132);
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

  it('does not force long mini forest walks to outrun the side-view walking frames', () => {
    const size = 34;
    const distance = 200;
    const speed = getRoamingAnimalWalkSpeedPxPerSecond({
      companionId: 'desert_fox',
      size,
    });
    const move = getRoamingAnimalMove({
      area: 'forest',
      companionId: 'desert_fox',
      from: { x: 40, y: 0 },
      size,
      to: { x: 40 + distance, y: 0 },
    });

    expect(move.durationMs).toBe(Math.round((distance / speed) * 1000));
    expect(move.durationMs).toBeGreaterThan(9200);
  });

  it('keeps each movement chunk inside the current walking frame window', () => {
    const dogFinalWalkingFrame = getRoamingAnimalMotionState({
      companionId: 'dog',
      elapsedMs: 9729,
    });
    const dogStoppedFrame = getRoamingAnimalMotionState({
      companionId: 'dog',
      elapsedMs: 9730,
    });

    expect(dogFinalWalkingFrame).toMatchObject({
      moving: true,
      remainingMovingMs: 1,
      waitMs: 0,
    });
    expect(dogStoppedFrame).toMatchObject({
      moving: false,
      remainingMovingMs: 0,
      waitMs: 1370,
    });
    expect(
      getRoamingAnimalMotionChunkDurationMs({
        remainingMoveDurationMs: 500,
        remainingMovingMs: dogFinalWalkingFrame.remainingMovingMs,
      }),
    ).toBe(1);
    expect(
      getRoamingAnimalMotionChunkDurationMs({
        remainingMoveDurationMs: 499,
        remainingMovingMs: dogStoppedFrame.remainingMovingMs,
      }),
    ).toBe(0);
    expect(
      getRoamingAnimalMotionChunkDurationMs({
        remainingMoveDurationMs: 12,
        remainingMovingMs: 30,
      }),
    ).toBe(12);
    expect(
      getRoamingAnimalMotionChunkDurationMs({
        remainingMoveDurationMs: 0,
        remainingMovingMs: 30,
      }),
    ).toBe(0);
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
      const first = getRoamingAnimalPoint({
        companionId: 'baby_rabbit',
        index: 0,
        sceneWidth,
        size,
        step,
      });
      const second = getRoamingAnimalPoint({
        companionId: 'desert_fox',
        index: 1,
        sceneWidth,
        size,
        step,
      });
      const centerDistance = Math.hypot(first.x - second.x, first.y - second.y);

      expect(centerDistance).toBeGreaterThanOrEqual(minimumCenterDistance);
    }
  });

  it('eases movement progress so walk starts softly and then accelerates', () => {
    expect(getRoamingAnimalMovementProgress(0)).toBe(0);
    expect(getRoamingAnimalMovementProgress(1)).toBe(1);
    expect(getRoamingAnimalMovementProgress(0.2)).toBeLessThan(0.2);
    expect(getRoamingAnimalMovementProgress(0.5)).toBeCloseTo(0.5, 3);
    expect(getRoamingAnimalMovementProgress(0.8)).toBeGreaterThan(0.8);
  });

  it('keeps simultaneous animal lanes from overlapping even when their route phases differ', () => {
    const sceneWidth = 390;
    const size = 84;

    for (let firstStep = 0; firstStep < 24; firstStep += 1) {
      for (let secondStep = 0; secondStep < 24; secondStep += 1) {
        const first = getRoamingAnimalPoint({
          companionId: 'baby_rabbit',
          index: 0,
          sceneWidth,
          size,
          step: firstStep,
        });
        const second = getRoamingAnimalPoint({
          companionId: 'desert_fox',
          index: 1,
          sceneWidth,
          size,
          step: secondStep,
        });
        const firstScreenY = first.y - getRoamingAnimalLayerOffsetY({ index: 0, size });
        const secondScreenY = second.y - getRoamingAnimalLayerOffsetY({ index: 1, size });
        const separatedHorizontally = Math.abs(first.x - second.x) >= size;
        const separatedVertically = Math.abs(firstScreenY - secondScreenY) >= size * 0.92;

        expect(separatedHorizontally || separatedVertically).toBe(true);
      }
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

  it('uses longer staggered timing for forest animals', () => {
    const indexes = [0, 1, 2, 3, 4, 5];
    const forestInitialDelays = indexes.map((index) =>
      getRoamingAnimalInitialDelayMs({ area: 'forest', index }),
    );
    const forestRestCounts = indexes.map((index) =>
      getRoamingAnimalNextRestWalkCount({
        area: 'forest',
        companionId: ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'][index],
        cycle: 0,
        index,
      }),
    );
    const growRestDelay = getRoamingAnimalIdleDelayMs({
      area: 'grow',
      index: 0,
      resting: true,
      step: 7,
    });
    const forestRestDelay = getRoamingAnimalIdleDelayMs({
      area: 'forest',
      index: 0,
      resting: true,
      step: 11,
    });

    expect(new Set(forestInitialDelays).size).toBe(indexes.length);
    expect(Math.max(...forestInitialDelays)).toBeGreaterThan(7000);
    expect(Math.min(...forestRestCounts)).toBeGreaterThanOrEqual(110);
    expect(Math.max(...forestRestCounts)).toBeLessThanOrEqual(180);
    expect(forestRestDelay).toBeGreaterThan(growRestDelay);
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
    for (const [companionId, profile] of Object.entries(EXPECTED_ROAMING_MOTION_PROFILES)) {
      for (const elapsedMs of profile.movingSamples) {
        const motionState = getRoamingAnimalMotionState({ companionId, elapsedMs });

        expect(motionState.moving).toBe(true);
        expect(motionState.waitMs).toBe(0);
        expect(motionState.remainingMovingMs).toBeGreaterThan(0);
      }
    }
  });

  it('pauses translation only for true non-walking portions inside side-view GIFs', () => {
    for (const [companionId, profile] of Object.entries(EXPECTED_ROAMING_MOTION_PROFILES)) {
      for (const elapsedMs of profile.stoppedSamples) {
        const motionState = getRoamingAnimalMotionState({ companionId, elapsedMs });

        expect(motionState.moving).toBe(false);
        expect(motionState.remainingMovingMs).toBe(0);
        expect(motionState.waitMs).toBeGreaterThan(0);
      }
    }
  });

  it('pins every current animal to frame-counted side-view motion windows', () => {
    for (const [companionId, expectedProfile] of Object.entries(EXPECTED_ROAMING_MOTION_PROFILES)) {
      const actualProfile = getRoamingAnimalMotionProfile({ companionId });

      expect(actualProfile.loopDurationMs).toBe(expectedProfile.loopDurationMs);
      expect(actualProfile.movingWindows).toEqual(expectedProfile.movingWindows);
      expect(getRoamingAnimalActiveMotionDurationMs({ companionId })).toBe(
        expectedProfile.activeDurationMs,
      );
    }
  });

  it('keeps frame-counted motion windows stable across repeated GIF loops', () => {
    for (const [companionId, profile] of Object.entries(EXPECTED_ROAMING_MOTION_PROFILES)) {
      for (const elapsedMs of profile.movingSamples) {
        for (const loopMultiplier of [0, 1, 2, 5]) {
          expect(
            getRoamingAnimalMotionState({
              companionId,
              elapsedMs: elapsedMs + profile.loopDurationMs * loopMultiplier,
            }).moving,
          ).toBe(true);
        }
      }

      for (const elapsedMs of profile.stoppedSamples) {
        for (const loopMultiplier of [0, 1, 2, 5]) {
          expect(
            getRoamingAnimalMotionState({
              companionId,
              elapsedMs: elapsedMs + profile.loopDurationMs * loopMultiplier,
            }).moving,
          ).toBe(false);
        }
      }
    }
  });

  it('holds rock_hyrax stationary during exact side-GIF pause boundary frames', () => {
    const companionId = 'rock_hyrax';

    const boundaryChecks = [
      { elapsedMs: 999, moving: false, remainingMovingMs: 0, waitMs: 1 },
      { elapsedMs: 1000, moving: true, remainingMovingMs: 4330, waitMs: 0 },
      { elapsedMs: 5329, moving: true, remainingMovingMs: 1, waitMs: 0 },
      { elapsedMs: 5330, moving: false, remainingMovingMs: 0, waitMs: 1700 },
      { elapsedMs: 5600, moving: false, remainingMovingMs: 0, waitMs: 1430 },
      { elapsedMs: 6029, moving: false, remainingMovingMs: 0, waitMs: 1001 },
    ];

    for (const expected of boundaryChecks) {
      const motionState = getRoamingAnimalMotionState({
        companionId,
        elapsedMs: expected.elapsedMs,
      });

      expect(motionState.moving).toBe(expected.moving);
      expect(motionState.remainingMovingMs).toBe(expected.remainingMovingMs);
      expect(motionState.waitMs).toBe(expected.waitMs);
      expect(getRoamingAnimalPose({ walking: motionState.moving })).toBe(
        expected.moving ? 'walking' : 'idle',
      );
    }
  });

  it('holds side-view intro and tail rest frames stationary for animals that include them', () => {
    const boundaryChecks = [
      { companionId: 'baby_rabbit', elapsedMs: 529, moving: false, waitMs: 141 },
      { companionId: 'baby_rabbit', elapsedMs: 669, moving: false, waitMs: 1 },
      { companionId: 'baby_rabbit', elapsedMs: 670, moving: true, waitMs: 0 },
      { companionId: 'dog', elapsedMs: 1069, moving: false, waitMs: 1 },
      { companionId: 'dog', elapsedMs: 1070, moving: true, waitMs: 0 },
      { companionId: 'dog', elapsedMs: 9729, moving: true, waitMs: 0 },
      { companionId: 'dog', elapsedMs: 9730, moving: false, waitMs: 1370 },
      { companionId: 'desert_fox', elapsedMs: 599, moving: false, waitMs: 1 },
      { companionId: 'desert_fox', elapsedMs: 600, moving: true, waitMs: 0 },
      { companionId: 'desert_fox', elapsedMs: 7929, moving: true, waitMs: 0 },
      { companionId: 'desert_fox', elapsedMs: 7930, moving: false, waitMs: 2670 },
      { companionId: 'desert_fox', elapsedMs: 8000, moving: false, waitMs: 2600 },
    ];

    for (const expected of boundaryChecks) {
      const motionState = getRoamingAnimalMotionState({
        companionId: expected.companionId,
        elapsedMs: expected.elapsedMs,
      });

      expect(motionState.moving).toBe(expected.moving);
      expect(motionState.waitMs).toBe(expected.waitMs);
    }
  });

  it('keeps rock_hyrax pause/move timing stable when advancing by full GIF loops', () => {
    const profile = getRoamingAnimalMotionProfile({ companionId: 'rock_hyrax' });
    const sampleOffsets = [0, 1, 999, 1000, 1001, 5329, 5330, 5600, 5800];

    for (const elapsedMs of sampleOffsets) {
      const first = getRoamingAnimalMotionState({ companionId: 'rock_hyrax', elapsedMs });

      for (const loop of [1, 2, 5]) {
        const repeat = getRoamingAnimalMotionState({
          companionId: 'rock_hyrax',
          elapsedMs: elapsedMs + profile.loopDurationMs * loop,
        });

        expect(repeat.moving).toBe(first.moving);
        expect(repeat.waitMs).toBe(first.waitMs);
        expect(repeat.remainingMovingMs).toBe(first.remainingMovingMs);
      }
    }
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
