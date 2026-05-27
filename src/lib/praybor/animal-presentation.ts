import type { RoamingAnimalPose } from './animal-roaming';

const ANIMAL_COMPANION_IMAGE_SCALES: Partial<
  Record<string, Partial<Record<RoamingAnimalPose, number>>>
> = {
  desert_fox: {
    walking: 1.18,
    idle: 1.04,
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
