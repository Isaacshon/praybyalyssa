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
export type RoamingAnimalMotionWindow = {
  startMs: number;
  endMs: number;
};
export type RoamingAnimalMotionProfile = {
  loopDurationMs: number;
  movingWindows: readonly RoamingAnimalMotionWindow[];
};

const ROAMING_ANIMAL_BODY_LENGTHS_PER_WALK_GIF_LOOP = 3;
const ROAMING_ANIMAL_MIN_WALK_DURATION_MS = 1000;
const ROAMING_ANIMAL_MAX_WALK_DURATION_MS = 5200;
const ROAMING_ANIMAL_WALK_TRANSITION_DELAY_MS = 0;
const ROAMING_ANIMAL_TURN_DELAY_MS = 110;
const ROAMING_ANIMAL_IDLE_TO_WALK_DELAY_MS = 190;
const ROAMING_ANIMAL_REST_BASE_DELAY_MS = 6400;
const ROAMING_ANIMAL_INITIAL_STEPS = [0, 4, 8, 2, 6] as const;
const ROAMING_ANIMAL_INITIAL_DELAYS_MS = [0, 720, 1360, 380, 1040] as const;
const ROAMING_ANIMAL_REST_SCHEDULES = [
  { interval: 11, phase: 6 },
  { interval: 13, phase: 10 },
  { interval: 17, phase: 3 },
  { interval: 19, phase: 14 },
  { interval: 23, phase: 8 },
] as const;
const DEFAULT_ROAMING_ANIMAL_MOTION_PROFILE = {
  loopDurationMs: 10030,
  movingWindows: [{ startMs: 0, endMs: 10030 }],
} as const;
const ROAMING_ANIMAL_MOTION_PROFILES: Record<string, RoamingAnimalMotionProfile> = {
  baby_rabbit: DEFAULT_ROAMING_ANIMAL_MOTION_PROFILE,
  desert_fox: {
    loopDurationMs: 10000,
    movingWindows: [
      { startMs: 900, endMs: 3200 },
      { startMs: 5700, endMs: 8300 },
    ],
  },
  rock_hyrax: {
    loopDurationMs: 6030,
    movingWindows: [{ startMs: 900, endMs: 5000 }],
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getRoamingAnimalPoint({
  index,
  sceneWidth,
  size,
  step,
}: {
  index: number;
  sceneWidth: number;
  size: number;
  step: number;
}) {
  const route = ROAMING_ANIMAL_ROUTES[index % ROAMING_ANIMAL_ROUTES.length];
  const waypoint = route[step % route.length];
  const horizontalPadding = Math.max(18, Math.round(sceneWidth * 0.06));
  const availableWidth = Math.max(40, sceneWidth - size - horizontalPadding * 2);

  return {
    x: Math.round(horizontalPadding + availableWidth * waypoint.x),
    y: waypoint.y,
  };
}

function getRouteVariant<T>(values: readonly T[], index: number) {
  return values[index % values.length];
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

export function getRoamingAnimalInitialStep({ index }: { index: number }) {
  return getRouteVariant(ROAMING_ANIMAL_INITIAL_STEPS, index);
}

export function getRoamingAnimalInitialDelayMs({ index }: { index: number }) {
  return getRouteVariant(ROAMING_ANIMAL_INITIAL_DELAYS_MS, index);
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

export function getRoamingAnimalMove({
  companionId,
  from,
  size = 84,
  to,
}: {
  companionId?: string;
  from: RoamingAnimalPoint;
  size?: number;
  to: RoamingAnimalPoint;
}) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const directionScaleX: RoamingAnimalDirectionScaleX = deltaX >= 0 ? -1 : 1;
  const durationMs = Math.round(
    clamp(
      (distance / getRoamingAnimalWalkSpeedPxPerSecond({ companionId, size })) * 1000,
      ROAMING_ANIMAL_MIN_WALK_DURATION_MS,
      ROAMING_ANIMAL_MAX_WALK_DURATION_MS,
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
  index,
  step,
}: {
  index: number;
  step: number;
}) {
  if (step <= 0) {
    return false;
  }

  const schedule = getRouteVariant(ROAMING_ANIMAL_REST_SCHEDULES, index);

  return step % schedule.interval === schedule.phase;
}

export function getRoamingAnimalIdleDelayMs({
  index,
  resting,
  step,
}: {
  index: number;
  resting: boolean;
  step: number;
}) {
  if (!resting) {
    return ROAMING_ANIMAL_WALK_TRANSITION_DELAY_MS;
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
