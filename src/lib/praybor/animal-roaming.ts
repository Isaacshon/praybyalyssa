import {
  FOREST_DIORAMA_BOARD_HEIGHT,
  FOREST_DIORAMA_BOARD_WIDTH,
  FOREST_DIORAMA_SLOTS,
  getForestDioramaSlotAnchor,
} from './diorama-layout';

export const ROAMING_ANIMAL_FACING_FRAME = {
  width: '100%',
  height: '100%',
} as const;

export type RoamingAnimalPoint = {
  x: number;
  y: number;
};

export type RoamingAnimalPose = 'idle' | 'walking';
export type RoamingAnimalDirectionScaleX = -1 | 1;
export type RoamingAnimalArea = 'grow' | 'forest';
export type RoamingAnimalMotionWindow = {
  startMs: number;
  endMs: number;
};
export type RoamingAnimalMotionProfile = {
  loopDurationMs: number;
  movingWindows: readonly RoamingAnimalMotionWindow[];
};
export type RoamingAnimalSourceFacing = 'left' | 'right';

const ROAMING_ANIMAL_BODY_LENGTHS_PER_WALK_GIF_LOOP = 3;
const ROAMING_ANIMAL_MIN_WALK_DURATION_MS = 1000;
const ROAMING_ANIMAL_MAX_WALK_DURATION_MS = 5200;
const FOREST_ROAMING_ANIMAL_MAX_WALK_DURATION_MS = 48000;
const ROAMING_ANIMAL_WALK_TRANSITION_DELAY_MS = 0;
const ROAMING_ANIMAL_TURN_DELAY_MS = 110;
const ROAMING_ANIMAL_IDLE_TO_WALK_DELAY_MS = 190;
const ROAMING_ANIMAL_REST_BASE_DELAY_MS = 6400;
const FOREST_ROAMING_ANIMAL_REST_BASE_DELAY_MS = 11800;
const ROAMING_ANIMAL_MIN_WALKS_BEFORE_REST = 7;
const FOREST_ROAMING_ANIMAL_MIN_WALKS_BEFORE_REST = 11;
const ROAMING_ANIMAL_REST_RANDOM_WALK_WINDOW = 5;
const FOREST_ROAMING_ANIMAL_REST_RANDOM_WALK_WINDOW = 7;
const ROAMING_ANIMAL_INITIAL_STEPS = [0, 4, 8, 2, 6] as const;
const FOREST_ROAMING_ANIMAL_INITIAL_STEPS = [0, 9, 17, 5, 13, 21] as const;
const ROAMING_ANIMAL_INITIAL_DELAYS_MS = [0, 720, 1360, 380, 1040] as const;
const FOREST_ROAMING_ANIMAL_INITIAL_DELAYS_MS = [0, 1650, 3220, 4740, 6120, 7560] as const;
const ROAMING_ANIMAL_MIN_LAYER_OFFSET_Y = 66;
const ROAMING_ANIMAL_LAYER_OFFSET_SIZE_FACTOR = 0.62;
const ROAMING_ANIMAL_ROUTE_CENTER_X = 0.5;
const ROAMING_ANIMAL_MAX_ROUTE_X_OFFSET_RATIO = 0.034;
const ROAMING_ANIMAL_MAX_ROUTE_Y_OFFSET = 6;
const ROAMING_ANIMAL_MAX_ROUTE_X_SCALE_DELTA = 0.07;
const FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS = 52;
const FOREST_DIORAMA_TREE_ROOT_SAFE_LANE_PADDING = 8;
const FOREST_DIORAMA_ANIMAL_FOOT_Y_FACTOR = 0.7;
const FOREST_DIORAMA_TREE_ROOTS = FOREST_DIORAMA_SLOTS.map(getForestDioramaSlotAnchor);
const FOREST_DIORAMA_MIN_TREE_ROOT_Y = Math.min(...FOREST_DIORAMA_TREE_ROOTS.map((root) => root.y));
const FOREST_DIORAMA_MAX_TREE_ROOT_Y = Math.max(...FOREST_DIORAMA_TREE_ROOTS.map((root) => root.y));
const ROAMING_ANIMAL_SOURCE_FACING: Partial<Record<string, RoamingAnimalSourceFacing>> = {
  dog: 'right',
};
const DEFAULT_ROAMING_ANIMAL_MOTION_PROFILE = {
  loopDurationMs: 10030,
  movingWindows: [{ startMs: 0, endMs: 10030 }],
} as const;
const ROAMING_ANIMAL_MOTION_PROFILES: Record<string, RoamingAnimalMotionProfile> = {
  baby_rabbit: {
    loopDurationMs: 10030,
    movingWindows: [{ startMs: 530, endMs: 10030 }],
  },
  dog: {
    loopDurationMs: 10030,
    movingWindows: [{ startMs: 1070, endMs: 9730 }],
  },
  desert_fox: {
    loopDurationMs: 10000,
    movingWindows: [{ startMs: 600, endMs: 7930 }],
  },
  rock_hyrax: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 800, endMs: 5600 }],
  },
  lion: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 0, endMs: 6030 }],
  },
  sheep: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 0, endMs: 6030 }],
  },
};
const ROAMING_ANIMAL_ROUTES = [
  [
    { x: 0.16, y: 108 },
    { x: 0.3, y: 94 },
    { x: 0.46, y: 82 },
    { x: 0.64, y: 98 },
    { x: 0.82, y: 118 },
    { x: 0.68, y: 88 },
    { x: 0.52, y: 116 },
    { x: 0.34, y: 102 },
    { x: 0.18, y: 88 },
    { x: 0.32, y: 104 },
    { x: 0.54, y: 122 },
    { x: 0.76, y: 132 },
  ],
  [
    { x: 0.86, y: 34 },
    { x: 0.78, y: 46 },
    { x: 0.66, y: 24 },
    { x: 0.36, y: 58 },
    { x: 0.2, y: 48 },
    { x: 0.34, y: 30 },
    { x: 0.18, y: 40 },
    { x: 0.58, y: 24 },
    { x: 0.86, y: 44 },
    { x: 0.72, y: 28 },
    { x: 0.46, y: 50 },
    { x: 0.24, y: 62 },
  ],
  [
    { x: 0.2, y: 56 },
    { x: 0.36, y: 82 },
    { x: 0.54, y: 108 },
    { x: 0.72, y: 86 },
    { x: 0.88, y: 60 },
    { x: 0.7, y: 36 },
    { x: 0.52, y: 58 },
    { x: 0.34, y: 84 },
    { x: 0.14, y: 110 },
    { x: 0.3, y: 86 },
    { x: 0.5, y: 62 },
    { x: 0.72, y: 38 },
  ],
  [
    { x: 0.78, y: 92 },
    { x: 0.62, y: 68 },
    { x: 0.44, y: 44 },
    { x: 0.24, y: 66 },
    { x: 0.08, y: 90 },
    { x: 0.24, y: 114 },
    { x: 0.42, y: 92 },
    { x: 0.6, y: 68 },
    { x: 0.82, y: 46 },
    { x: 0.64, y: 70 },
    { x: 0.44, y: 94 },
    { x: 0.22, y: 116 },
  ],
  [
    { x: 0.1, y: 42 },
    { x: 0.26, y: 66 },
    { x: 0.44, y: 90 },
    { x: 0.64, y: 68 },
    { x: 0.84, y: 44 },
    { x: 0.68, y: 26 },
    { x: 0.5, y: 48 },
    { x: 0.32, y: 70 },
    { x: 0.12, y: 94 },
    { x: 0.3, y: 70 },
    { x: 0.52, y: 46 },
    { x: 0.76, y: 28 },
  ],
] as const;
const FOREST_ROAMING_ANIMAL_ROUTES = [
  [
    { x: 0.12, y: 0.78 },
    { x: 0.28, y: 0.82 },
    { x: 0.46, y: 0.84 },
    { x: 0.68, y: 0.8 },
    { x: 0.88, y: 0.8 },
    { x: 0.92, y: 0.86 },
    { x: 0.72, y: 0.9 },
    { x: 0.5, y: 0.86 },
    { x: 0.3, y: 0.9 },
    { x: 0.1, y: 0.84 },
    { x: 0.08, y: 0.76 },
    { x: 0.22, y: 0.78 },
  ],
  [
    { x: 0.86, y: 0.16 },
    { x: 0.66, y: 0.12 },
    { x: 0.48, y: 0.16 },
    { x: 0.3, y: 0.14 },
    { x: 0.12, y: 0.16 },
    { x: 0.08, y: 0.12 },
    { x: 0.24, y: 0.1 },
    { x: 0.44, y: 0.16 },
    { x: 0.62, y: 0.1 },
    { x: 0.82, y: 0.14 },
    { x: 0.92, y: 0.16 },
    { x: 0.72, y: 0.17 },
  ],
  [
    { x: 0.18, y: 0.88 },
    { x: 0.36, y: 0.82 },
    { x: 0.56, y: 0.76 },
    { x: 0.76, y: 0.82 },
    { x: 0.94, y: 0.88 },
    { x: 0.82, y: 0.72 },
    { x: 0.58, y: 0.76 },
    { x: 0.34, y: 0.78 },
    { x: 0.1, y: 0.8 },
    { x: 0.22, y: 0.9 },
    { x: 0.48, y: 0.88 },
    { x: 0.7, y: 0.84 },
  ],
  [
    { x: 0.16, y: 0.1 },
    { x: 0.34, y: 0.16 },
    { x: 0.54, y: 0.17 },
    { x: 0.76, y: 0.14 },
    { x: 0.92, y: 0.1 },
    { x: 0.86, y: 0.16 },
    { x: 0.64, y: 0.17 },
    { x: 0.42, y: 0.14 },
    { x: 0.2, y: 0.16 },
    { x: 0.08, y: 0.14 },
    { x: 0.26, y: 0.1 },
    { x: 0.48, y: 0.12 },
  ],
  [
    { x: 0.78, y: 0.78 },
    { x: 0.92, y: 0.78 },
    { x: 0.82, y: 0.88 },
    { x: 0.58, y: 0.92 },
    { x: 0.36, y: 0.86 },
    { x: 0.12, y: 0.9 },
    { x: 0.08, y: 0.78 },
    { x: 0.26, y: 0.78 },
    { x: 0.5, y: 0.8 },
    { x: 0.72, y: 0.82 },
    { x: 0.9, y: 0.88 },
    { x: 0.68, y: 0.9 },
  ],
  [
    { x: 0.1, y: 0.18 },
    { x: 0.28, y: 0.12 },
    { x: 0.5, y: 0.1 },
    { x: 0.74, y: 0.16 },
    { x: 0.94, y: 0.12 },
    { x: 0.82, y: 0.16 },
    { x: 0.6, y: 0.16 },
    { x: 0.38, y: 0.16 },
    { x: 0.18, y: 0.14 },
    { x: 0.08, y: 0.1 },
    { x: 0.32, y: 0.18 },
    { x: 0.56, y: 0.14 },
  ],
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getForestDioramaCoverTransform({
  renderedBoardHeight,
  renderedBoardWidth,
}: {
  renderedBoardHeight: number;
  renderedBoardWidth: number;
}) {
  const boardScale = Math.max(
    renderedBoardWidth / FOREST_DIORAMA_BOARD_WIDTH,
    renderedBoardHeight / FOREST_DIORAMA_BOARD_HEIGHT,
  );
  const drawnBoardWidth = FOREST_DIORAMA_BOARD_WIDTH * boardScale;
  const drawnBoardHeight = FOREST_DIORAMA_BOARD_HEIGHT * boardScale;

  return {
    boardScale,
    coverOffsetX: (renderedBoardWidth - drawnBoardWidth) / 2,
    coverOffsetY: (renderedBoardHeight - drawnBoardHeight) / 2,
  };
}

function avoidForestDioramaTreeRoots({
  horizontalPadding,
  point,
  sceneHeight,
  sceneWidth,
  size,
  verticalPadding,
}: {
  horizontalPadding: number;
  point: RoamingAnimalPoint;
  sceneHeight: number;
  sceneWidth: number;
  size: number;
  verticalPadding: number;
}) {
  const { boardScale, coverOffsetX, coverOffsetY } = getForestDioramaCoverTransform({
    renderedBoardHeight: sceneHeight,
    renderedBoardWidth: sceneWidth,
  });
  const animalFootOffsetX = size / 2;
  const animalFootOffsetY = size * FOREST_DIORAMA_ANIMAL_FOOT_Y_FACTOR;
  let boardFootX = (point.x + animalFootOffsetX - coverOffsetX) / boardScale;
  let boardFootY = (point.y + animalFootOffsetY - coverOffsetY) / boardScale;
  const getNearestTreeRootDistance = ({
    x,
    y,
  }: {
    x: number;
    y: number;
  }) =>
    Math.min(...FOREST_DIORAMA_TREE_ROOTS.map((root) => Math.hypot(x - root.x, y - root.y)));
  const moveFootToNearestSafeLane = (y: number) =>
    y < FOREST_DIORAMA_BOARD_HEIGHT * 0.5
      ? FOREST_DIORAMA_MIN_TREE_ROOT_Y -
        FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS -
        FOREST_DIORAMA_TREE_ROOT_SAFE_LANE_PADDING
      : FOREST_DIORAMA_MAX_TREE_ROOT_Y +
        FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS +
        FOREST_DIORAMA_TREE_ROOT_SAFE_LANE_PADDING;
  const getRenderedPointFromBoardFoot = ({
    x,
    y,
  }: {
    x: number;
    y: number;
  }) => ({
    x: Math.round(
      clamp(
        coverOffsetX + x * boardScale - animalFootOffsetX,
        horizontalPadding,
        sceneWidth - size - horizontalPadding,
      ),
    ),
    y: Math.round(
      clamp(
        coverOffsetY + y * boardScale - animalFootOffsetY,
        verticalPadding,
        sceneHeight - size - verticalPadding,
      ),
    ),
  });
  const getBoardFootFromRenderedPoint = ({ x, y }: RoamingAnimalPoint) => ({
    x: (x + animalFootOffsetX - coverOffsetX) / boardScale,
    y: (y + animalFootOffsetY - coverOffsetY) / boardScale,
  });

  for (let iteration = 0; iteration < 4; iteration += 1) {
    let pushed = false;

    for (const root of FOREST_DIORAMA_TREE_ROOTS) {
      const deltaX = boardFootX - root.x;
      const deltaY = boardFootY - root.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance >= FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS) {
        continue;
      }

      const fallbackAngle = Math.atan2(
        boardFootY - FOREST_DIORAMA_BOARD_HEIGHT * 0.5,
        boardFootX - FOREST_DIORAMA_BOARD_WIDTH * 0.5,
      );
      const unitX = distance > 0.001 ? deltaX / distance : Math.cos(fallbackAngle);
      const unitY = distance > 0.001 ? deltaY / distance : Math.sin(fallbackAngle);
      const pushDistance = FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS - distance;

      boardFootX += unitX * pushDistance;
      boardFootY += unitY * pushDistance;
      pushed = true;
    }

    if (!pushed) {
      break;
    }
  }

  if (
    getNearestTreeRootDistance({ x: boardFootX, y: boardFootY }) <
    FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS
  ) {
    boardFootY = moveFootToNearestSafeLane(boardFootY);
  }

  let renderedPoint = getRenderedPointFromBoardFoot({ x: boardFootX, y: boardFootY });
  const renderedBoardFoot = getBoardFootFromRenderedPoint(renderedPoint);

  if (
    getNearestTreeRootDistance(renderedBoardFoot) <
    FOREST_DIORAMA_TREE_ROOT_AVOID_RADIUS
  ) {
    boardFootY = moveFootToNearestSafeLane(renderedBoardFoot.y);
    renderedPoint = getRenderedPointFromBoardFoot({ x: boardFootX, y: boardFootY });
  }

  return renderedPoint;
}

function hashRoamingAnimalRouteSeed({
  companionId = '',
  cycle,
  index,
}: {
  companionId?: string;
  cycle: number;
  index: number;
}) {
  let hash = 2166136261;
  const input = `route:${companionId}:${index}:${cycle}`;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getSignedSeedUnit({
  bucketCount,
  seed,
  shift,
}: {
  bucketCount: number;
  seed: number;
  shift: number;
}) {
  const midpoint = (bucketCount - 1) / 2;

  return (((seed >>> shift) % bucketCount) - midpoint) / midpoint;
}

function getRoamingAnimalRouteVariation({
  area = 'grow',
  companionId,
  index,
  routeLength,
  step,
}: {
  area?: RoamingAnimalArea;
  companionId?: string;
  index: number;
  routeLength: number;
  step: number;
}) {
  if (!companionId) {
    return {
      xOffsetRatio: 0,
      xScale: 1,
      yOffset: 0,
    };
  }

  const routeCycle = Math.floor(step / routeLength);
  const seed = hashRoamingAnimalRouteSeed({
    companionId,
    cycle: routeCycle,
    index,
  });

  return {
    xOffsetRatio:
      getSignedSeedUnit({ bucketCount: 9, seed, shift: 0 }) *
      ROAMING_ANIMAL_MAX_ROUTE_X_OFFSET_RATIO *
      (area === 'forest' ? 1.85 : 1),
    xScale:
      1 +
      getSignedSeedUnit({ bucketCount: 7, seed, shift: 8 }) *
        ROAMING_ANIMAL_MAX_ROUTE_X_SCALE_DELTA,
    yOffset:
      getSignedSeedUnit({ bucketCount: 7, seed, shift: 16 }) *
      ROAMING_ANIMAL_MAX_ROUTE_Y_OFFSET *
      (area === 'forest' ? 3 : 1),
  };
}

export function getRoamingAnimalPoint({
  area = 'grow',
  companionId,
  index,
  sceneHeight,
  sceneWidth,
  size,
  step,
}: {
  area?: RoamingAnimalArea;
  companionId?: string;
  index: number;
  sceneHeight?: number;
  sceneWidth: number;
  size: number;
  step: number;
}) {
  const route =
    area === 'forest'
      ? FOREST_ROAMING_ANIMAL_ROUTES[index % FOREST_ROAMING_ANIMAL_ROUTES.length]
      : ROAMING_ANIMAL_ROUTES[index % ROAMING_ANIMAL_ROUTES.length];
  const waypoint = route[step % route.length];
  const routeVariation = getRoamingAnimalRouteVariation({
    area,
    companionId,
    index,
    routeLength: route.length,
    step,
  });

  if (area === 'forest') {
    const normalizedSceneHeight = Math.max(size + 120, sceneHeight ?? sceneWidth * 1.9);
    const horizontalPadding = Math.max(10, Math.round(sceneWidth * 0.025));
    const verticalPadding = Math.max(58, Math.round(normalizedSceneHeight * 0.07));
    const availableWidth = Math.max(40, sceneWidth - size - horizontalPadding * 2);
    const availableHeight = Math.max(120, normalizedSceneHeight - size - verticalPadding * 2);
    const xRatio = clamp(
      waypoint.x + routeVariation.xOffsetRatio,
      0.04,
      0.96,
    );
    const yRatio = clamp(
      waypoint.y + routeVariation.yOffset / normalizedSceneHeight,
      0.08,
      0.92,
    );

    return avoidForestDioramaTreeRoots({
      horizontalPadding,
      point: {
        x: Math.round(horizontalPadding + availableWidth * xRatio),
        y: Math.round(verticalPadding + availableHeight * yRatio),
      },
      sceneHeight: normalizedSceneHeight,
      sceneWidth,
      size,
      verticalPadding,
    });
  }

  const horizontalPadding = Math.max(18, Math.round(sceneWidth * 0.06));
  const availableWidth = Math.max(40, sceneWidth - size - horizontalPadding * 2);
  const xRatio = clamp(
    ROAMING_ANIMAL_ROUTE_CENTER_X +
      (waypoint.x - ROAMING_ANIMAL_ROUTE_CENTER_X) * routeVariation.xScale +
      routeVariation.xOffsetRatio,
    0.08,
    0.92,
  );

  return {
    x: Math.round(horizontalPadding + availableWidth * xRatio),
    y: Math.round(clamp(waypoint.y + routeVariation.yOffset, 24, 132)),
  };
}

function getRouteVariant<T>(values: readonly T[], index: number) {
  return values[index % values.length];
}

function hashRoamingAnimalRestSeed({
  companionId = '',
  cycle,
  index,
}: {
  companionId?: string;
  cycle: number;
  index: number;
}) {
  let hash = 2166136261;
  const input = `${companionId}:${index}:${cycle}`;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getNormalizedMotionElapsedMs({
  elapsedMs,
  loopDurationMs,
}: {
  elapsedMs: number;
  loopDurationMs: number;
}) {
  return ((elapsedMs % loopDurationMs) + loopDurationMs) % loopDurationMs;
}

export function getRoamingAnimalInitialStep({
  area = 'grow',
  index,
}: {
  area?: RoamingAnimalArea;
  index: number;
}) {
  return getRouteVariant(
    area === 'forest' ? FOREST_ROAMING_ANIMAL_INITIAL_STEPS : ROAMING_ANIMAL_INITIAL_STEPS,
    index,
  );
}

export function getRoamingAnimalInitialDelayMs({
  area = 'grow',
  index,
}: {
  area?: RoamingAnimalArea;
  index: number;
}) {
  return getRouteVariant(
    area === 'forest' ? FOREST_ROAMING_ANIMAL_INITIAL_DELAYS_MS : ROAMING_ANIMAL_INITIAL_DELAYS_MS,
    index,
  );
}

export function getRoamingAnimalLayerOffsetY({
  index,
  size,
}: {
  index: number;
  size: number;
}) {
  if (index <= 0) {
    return 0;
  }

  return index * Math.round(
    Math.max(ROAMING_ANIMAL_MIN_LAYER_OFFSET_Y, size * ROAMING_ANIMAL_LAYER_OFFSET_SIZE_FACTOR),
  );
}

export function getRoamingAnimalNextRestWalkCount({
  area = 'grow',
  companionId,
  cycle,
  index,
}: {
  area?: RoamingAnimalArea;
  companionId?: string;
  cycle: number;
  index: number;
}) {
  const minWalksBeforeRest =
    area === 'forest'
      ? FOREST_ROAMING_ANIMAL_MIN_WALKS_BEFORE_REST
      : ROAMING_ANIMAL_MIN_WALKS_BEFORE_REST;
  const randomWalkWindow =
    area === 'forest'
      ? FOREST_ROAMING_ANIMAL_REST_RANDOM_WALK_WINDOW
      : ROAMING_ANIMAL_REST_RANDOM_WALK_WINDOW;

  return (
    minWalksBeforeRest +
    (hashRoamingAnimalRestSeed({ companionId, cycle, index }) %
      (randomWalkWindow + 1))
  );
}

export function getRoamingAnimalMotionProfile({ companionId }: { companionId?: string }) {
  if (!companionId) {
    return DEFAULT_ROAMING_ANIMAL_MOTION_PROFILE;
  }

  return ROAMING_ANIMAL_MOTION_PROFILES[companionId] ?? DEFAULT_ROAMING_ANIMAL_MOTION_PROFILE;
}

export function getRoamingAnimalActiveMotionDurationMs({ companionId }: { companionId?: string }) {
  const profile = getRoamingAnimalMotionProfile({ companionId });

  return profile.movingWindows.reduce(
    (total, window) => total + Math.max(0, window.endMs - window.startMs),
    0,
  );
}

export function getRoamingAnimalMotionState({
  companionId,
  elapsedMs,
}: {
  companionId?: string;
  elapsedMs: number;
}) {
  const profile = getRoamingAnimalMotionProfile({ companionId });
  const positionMs = getNormalizedMotionElapsedMs({
    elapsedMs,
    loopDurationMs: profile.loopDurationMs,
  });
  const movingWindow = profile.movingWindows.find(
    (window) => positionMs >= window.startMs && positionMs < window.endMs,
  );

  if (movingWindow) {
    return {
      moving: true,
      positionMs,
      remainingMovingMs: movingWindow.endMs - positionMs,
      waitMs: 0,
    };
  }

  const nextWindow =
    profile.movingWindows.find((window) => window.startMs > positionMs) ??
    profile.movingWindows[0];
  const waitMs =
    nextWindow.startMs > positionMs
      ? nextWindow.startMs - positionMs
      : profile.loopDurationMs - positionMs + nextWindow.startMs;

  return {
    moving: false,
    positionMs,
    remainingMovingMs: 0,
    waitMs,
  };
}

export function getRoamingAnimalWalkSpeedPxPerSecond({
  companionId,
  size,
}: {
  companionId?: string;
  size: number;
}) {
  const activeMotionDurationMs = Math.max(
    1,
    getRoamingAnimalActiveMotionDurationMs({ companionId }),
  );

  return (size * ROAMING_ANIMAL_BODY_LENGTHS_PER_WALK_GIF_LOOP * 1000) / activeMotionDurationMs;
}

export function getRoamingAnimalMovementProgress(progress: number) {
  const clampedProgress = clamp(progress, 0, 1);

  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
}

export function getRoamingAnimalMotionChunkDurationMs({
  remainingMoveDurationMs,
  remainingMovingMs,
}: {
  remainingMoveDurationMs: number;
  remainingMovingMs: number;
}) {
  if (remainingMoveDurationMs <= 0 || remainingMovingMs <= 0) {
    return 0;
  }

  return Math.min(
    Math.max(1, remainingMoveDurationMs),
    Math.max(1, remainingMovingMs),
  );
}

export function getRoamingAnimalMove({
  area = 'grow',
  companionId,
  from,
  size = 84,
  to,
}: {
  area?: RoamingAnimalArea;
  companionId?: string;
  from: RoamingAnimalPoint;
  size?: number;
  to: RoamingAnimalPoint;
}) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const sourceFacing = ROAMING_ANIMAL_SOURCE_FACING[companionId ?? ''] ?? 'left';
  const directionScaleX: RoamingAnimalDirectionScaleX =
    sourceFacing === 'right'
      ? deltaX >= 0
        ? 1
        : -1
      : deltaX >= 0
        ? -1
        : 1;
  const durationMs = Math.round(
    clamp(
      (distance / getRoamingAnimalWalkSpeedPxPerSecond({ companionId, size })) * 1000,
      ROAMING_ANIMAL_MIN_WALK_DURATION_MS,
      area === 'forest'
        ? FOREST_ROAMING_ANIMAL_MAX_WALK_DURATION_MS
        : ROAMING_ANIMAL_MAX_WALK_DURATION_MS,
    ),
  );

  return {
    deltaX,
    deltaY,
    distance,
    directionAngleDeg: Math.round((Math.atan2(deltaY, deltaX) * 180) / Math.PI),
    directionScaleX,
    durationMs,
  };
}

export function getRoamingAnimalPose({
  walking,
}: {
  walking: boolean;
}): RoamingAnimalPose {
  return walking ? 'walking' : 'idle';
}

export function shouldRoamingAnimalRest({
  companionId,
  cycle = 0,
  index,
  step,
  completedWalksSinceRest = step,
}: {
  companionId?: string;
  completedWalksSinceRest?: number;
  cycle?: number;
  index: number;
  step: number;
}) {
  if (step <= 0) {
    return false;
  }

  return completedWalksSinceRest >= getRoamingAnimalNextRestWalkCount({
    companionId,
    cycle,
    index,
  });
}

export function getRoamingAnimalIdleDelayMs({
  area = 'grow',
  index,
  resting,
  step,
}: {
  area?: RoamingAnimalArea;
  index: number;
  resting: boolean;
  step: number;
}) {
  if (!resting) {
    return ROAMING_ANIMAL_WALK_TRANSITION_DELAY_MS;
  }

  if (area === 'forest') {
    return FOREST_ROAMING_ANIMAL_REST_BASE_DELAY_MS + (index % 6) * 980 + (step % 7) * 520;
  }

  return ROAMING_ANIMAL_REST_BASE_DELAY_MS + (index % 5) * 470 + (step % 5) * 360;
}

export function getRoamingAnimalTurnDelayMs({
  previousDirectionScaleX,
  nextDirectionScaleX,
  wasIdle,
}: {
  previousDirectionScaleX: RoamingAnimalDirectionScaleX | null;
  nextDirectionScaleX: RoamingAnimalDirectionScaleX;
  wasIdle: boolean;
}) {
  if (wasIdle) {
    return ROAMING_ANIMAL_IDLE_TO_WALK_DELAY_MS;
  }

  if (previousDirectionScaleX === null || previousDirectionScaleX === nextDirectionScaleX) {
    return 0;
  }

  return ROAMING_ANIMAL_TURN_DELAY_MS;
}
