import type { RoamingAnimalPose } from './animal-roaming';

const ANIMAL_COMPANION_IMAGE_SCALES: Partial<
  Record<string, Partial<Record<RoamingAnimalPose, number>>>
> = {
  desert_fox: {
    walking: 1.02,
    idle: 0.98,
  },
};

const ANIMAL_COMPANION_IMAGE_FRAME_SCALE_X: Partial<
  Record<string, Partial<Record<RoamingAnimalPose, number>>>
> = {
  desert_fox: {
    walking: 16 / 9,
  },
};

const DEFAULT_ANIMAL_COMPANION_POSE_LOOP_DURATION_MS = 6030;
const ANIMAL_COMPANION_POSE_LOOP_DURATIONS_MS: Partial<
  Record<string, Partial<Record<RoamingAnimalPose, number>>>
> = {
  baby_rabbit: {
    walking: 10030,
    idle: 6030,
  },
  dog: {
    walking: 10030,
    idle: 10030,
  },
  desert_fox: {
    walking: 10000,
    idle: 6030,
  },
  rock_hyrax: {
    walking: 6030,
    idle: 6030,
  },
  lion: {
    walking: 6030,
    idle: 6030,
  },
  sheep: {
    walking: 6030,
    idle: 6030,
  },
};

export function getAnimalCompanionImageScale({
  companionId,
  pose,
}: {
  companionId: string;
  pose: RoamingAnimalPose;
}) {
  return ANIMAL_COMPANION_IMAGE_SCALES[companionId]?.[pose] ?? 1;
}

export function getAnimalCompanionImageFrameScaleX({
  companionId,
  pose,
}: {
  companionId: string;
  pose: RoamingAnimalPose;
}) {
  return ANIMAL_COMPANION_IMAGE_FRAME_SCALE_X[companionId]?.[pose] ?? 1;
}

export function getAnimalCompanionPoseLoopDurationMs({
  companionId,
  pose,
}: {
  companionId: string;
  pose: RoamingAnimalPose;
}) {
  return (
    ANIMAL_COMPANION_POSE_LOOP_DURATIONS_MS[companionId]?.[pose] ??
    DEFAULT_ANIMAL_COMPANION_POSE_LOOP_DURATION_MS
  );
}

export function getAnimalCompanionPoseSwitchDelayMs({
  companionId,
  currentPose,
  elapsedMs,
  reduceMotion = false,
}: {
  companionId: string;
  currentPose: RoamingAnimalPose;
  elapsedMs: number;
  reduceMotion?: boolean;
}) {
  if (reduceMotion) {
    return 0;
  }

  const loopDurationMs = getAnimalCompanionPoseLoopDurationMs({
    companionId,
    pose: currentPose,
  });
  const normalizedElapsedMs = ((elapsedMs % loopDurationMs) + loopDurationMs) % loopDurationMs;

  return normalizedElapsedMs === 0 ? 0 : loopDurationMs - normalizedElapsedMs;
}
