export type MoodId =
  | 'joy'
  | 'excitement'
  | 'gratitude'
  | 'ordinary'
  | 'surprised'
  | 'uncomfortable'
  | 'exhausted'
  | 'afraid'
  | 'sad'
  | 'angry';

export type PrayerVisibility = 'public' | 'group';
export type PrayerIdentity = 'anonymous' | 'real_name';
export type ReactionType = 'prayer' | 'amen' | 'comfort' | 'love';
export type TreeGrowthStage =
  | 'seed'
  | 'sprout'
  | 'small_plant'
  | 'young_tree'
  | 'fruiting_tree'
  | 'completed';
export type TreeGrowthEventType = 'prayer_posted' | 'reaction_given' | 'recap_completed';

export type MoodOption = {
  id: MoodId;
  label: string;
  koreanLabel: string;
  color: string;
  face: string;
  accessibilityLabel: string;
};

export type PrayerDraftInput = {
  title: string;
  body: string;
  mood?: MoodId;
  visibility: PrayerVisibility;
  identity: PrayerIdentity;
  groupId?: string;
  paperColor?: string;
  pinSeed?: number;
};

export type PrayerDraft = PrayerDraftInput & {
  mood: MoodId;
  createdAt: string;
};

export type PrayerReaction = {
  prayerId: string;
  userId: string;
  type: ReactionType;
  reactedAt?: string;
};

export type TreeSpecies = {
  id: string;
  label: string;
  fruitLabel: string;
  rarity: 'common' | 'uncommon' | 'rare';
};

export type ActiveTree = {
  id: string;
  speciesId: string;
  growthPoints: number;
  startedAt: string;
};

export type TreeCollectionEntry = ActiveTree & {
  completedAt: string;
};

export type TreeGrowthEvent = {
  type: TreeGrowthEventType;
  occurredOn: string;
};

export const COMPLETE_GROWTH_POINTS = 100;

export const GROWTH_EVENT_POINTS: Record<TreeGrowthEventType, number> = {
  prayer_posted: 5,
  reaction_given: 10,
  recap_completed: 5,
};

export const MOODS: MoodOption[] = [
  mood('joy', 'Joy', 'Joy', '#FFD84D', 'smile'),
  mood('excitement', 'Excitement', 'Excitement', '#FF9846', 'closed smile'),
  mood('gratitude', 'Gratitude', 'Gratitude', '#9DD96F', 'soft smile'),
  mood('ordinary', 'Ordinary', 'Ordinary', '#25D987', 'calm face'),
  mood('surprised', 'Surprised', 'Surprised', '#22B8C7', 'surprised face'),
  mood('uncomfortable', 'Uncomfortable', 'Uncomfortable', '#C95CF0', 'uneasy face'),
  mood('exhausted', 'Exhausted', 'Exhausted', '#9D7BFF', 'tired face'),
  mood('afraid', 'Afraid', 'Afraid', '#18C6A0', 'worried face'),
  mood('sad', 'Sad', 'Sad', '#6F73F6', 'crying face'),
  mood('angry', 'Angry', 'Angry', '#FF4B4B', 'angry face'),
];

export const TREE_SPECIES: TreeSpecies[] = [
  { id: 'apple', label: 'Apple Tree', fruitLabel: 'apple', rarity: 'common' },
  { id: 'pear', label: 'Pear Tree', fruitLabel: 'pear', rarity: 'common' },
  { id: 'grape_vine', label: 'Grape Vine', fruitLabel: 'grape cluster', rarity: 'uncommon' },
  { id: 'cedar', label: 'Cedar', fruitLabel: 'cone', rarity: 'rare' },
  { id: 'baobab', label: 'Baobab', fruitLabel: 'baobab fruit', rarity: 'rare' },
  { id: 'walnut', label: 'Walnut Tree', fruitLabel: 'walnut', rarity: 'uncommon' },
  { id: 'cherry_blossom', label: 'Cherry Blossom', fruitLabel: 'blossom', rarity: 'rare' },
  { id: 'ginkgo', label: 'Ginkgo', fruitLabel: 'golden leaf', rarity: 'uncommon' },
];

export function createPrayerDraft(input: PrayerDraftInput): PrayerDraft {
  if (!input.mood) {
    throw new Error('Choose a mood before posting a prayer.');
  }

  return {
    ...input,
    mood: input.mood,
    createdAt: new Date().toISOString(),
  };
}

export function setPrayerReaction(
  existing: PrayerReaction[],
  nextReaction: PrayerReaction,
): PrayerReaction[] {
  const withoutPrevious = existing.filter(
    (reaction) =>
      reaction.prayerId !== nextReaction.prayerId || reaction.userId !== nextReaction.userId,
  );

  return [
    ...withoutPrevious,
    {
      ...nextReaction,
      reactedAt: nextReaction.reactedAt ?? new Date().toISOString(),
    },
  ];
}

export function addGrowthEvent<TTree extends ActiveTree>(tree: TTree, event: TreeGrowthEvent): TTree {
  const growthPoints = Math.min(
    COMPLETE_GROWTH_POINTS,
    tree.growthPoints + GROWTH_EVENT_POINTS[event.type],
  );

  return {
    ...tree,
    growthPoints,
  };
}

export function getGrowthStage(growthPoints: number): TreeGrowthStage {
  if (growthPoints >= COMPLETE_GROWTH_POINTS) {
    return 'completed';
  }
  if (growthPoints >= 80) {
    return 'fruiting_tree';
  }
  if (growthPoints >= 60) {
    return 'young_tree';
  }
  if (growthPoints >= 30) {
    return 'small_plant';
  }
  if (growthPoints >= 15) {
    return 'sprout';
  }
  return 'seed';
}

export function completeActiveTree(
  tree: ActiveTree,
  species: TreeSpecies[],
  nextSpeciesIndex: number,
) {
  if (tree.growthPoints < COMPLETE_GROWTH_POINTS) {
    throw new Error('A tree must reach 100 growth points before it can be planted in the forest.');
  }
  if (species.length === 0) {
    throw new Error('At least one tree species is required to create the next seed.');
  }

  const completedAt = new Date().toISOString();
  const nextSpecies = species[nextSpeciesIndex % species.length];

  return {
    collectionEntry: {
      ...tree,
      completedAt,
    } satisfies TreeCollectionEntry,
    nextActiveTree: {
      id: `tree-${completedAt}`,
      speciesId: nextSpecies.id,
      growthPoints: 0,
      startedAt: completedAt,
    } satisfies ActiveTree,
  };
}

function mood(
  id: MoodId,
  label: string,
  koreanLabel: string,
  color: string,
  face: string,
): MoodOption {
  return {
    id,
    label,
    koreanLabel,
    color,
    face,
    accessibilityLabel: `${label} mood`,
  };
}
