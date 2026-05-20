import {
  TREE_SPECIES,
  type ActiveTree,
  type MoodId,
  type PrayerIdentity,
  type PrayerReaction,
  type PrayerVisibility,
  type ReactionType,
  type TreeCollectionEntry,
} from './domain';
import { buildSituationPrayer } from './situation-prompts';

export type PrayerCard = {
  id: string;
  title: string;
  body: string;
  mood: MoodId;
  visibility: PrayerVisibility;
  identity: PrayerIdentity;
  authorLabel: string;
  neighborhood?: string;
  groupName?: string;
  postedAgo: string;
  isSensitive?: boolean;
  paperColor?: string;
  pinSeed?: number;
};

const publicQuietMindPrayer = buildSituationPrayer(['overthinking', 'relationship_conflict']);
const publicHealingPrayer = buildSituationPrayer(['health_recovery', 'gratitude']);
const publicRestPrayer = buildSituationPrayer(['exhaustion', 'burnout']);
const publicInterviewPrayer = buildSituationPrayer(['interview', 'future_direction']);
const groupCommunityPrayer = buildSituationPrayer(['church_community', 'serving_church']);
const groupTreatmentPrayer = buildSituationPrayer(['treatment', 'doctor_wisdom']);
const groupThanksPrayer = buildSituationPrayer(['answered_prayer', 'relationship_conflict']);

export const publicPrayerCards: PrayerCard[] = [
  {
    id: 'pub-1',
    title: publicQuietMindPrayer.title,
    body: publicQuietMindPrayer.body,
    mood: 'afraid',
    visibility: 'public',
    identity: 'anonymous',
    authorLabel: 'A neighbor',
    neighborhood: 'Midtown',
    postedAgo: '12m',
  },
  {
    id: 'pub-2',
    title: publicHealingPrayer.title,
    body: publicHealingPrayer.body,
    mood: 'gratitude',
    visibility: 'public',
    identity: 'real_name',
    authorLabel: 'Maya R.',
    neighborhood: 'Midtown',
    postedAgo: '38m',
  },
  {
    id: 'pub-3',
    title: publicRestPrayer.title,
    body: publicRestPrayer.body,
    mood: 'exhausted',
    visibility: 'public',
    identity: 'anonymous',
    authorLabel: 'A neighbor',
    neighborhood: 'Midtown',
    postedAgo: '1h',
    isSensitive: true,
  },
  {
    id: 'pub-4',
    title: publicInterviewPrayer.title,
    body: publicInterviewPrayer.body,
    mood: 'excitement',
    visibility: 'public',
    identity: 'real_name',
    authorLabel: 'Daniel',
    neighborhood: 'Midtown',
    postedAgo: '2h',
  },
];

export const groupPrayerCards: PrayerCard[] = [
  {
    id: 'grp-1',
    title: groupCommunityPrayer.title,
    body: groupCommunityPrayer.body,
    mood: 'joy',
    visibility: 'group',
    identity: 'real_name',
    authorLabel: 'Pastor Lee',
    groupName: 'Friday House Church',
    postedAgo: '8m',
  },
  {
    id: 'grp-2',
    title: groupTreatmentPrayer.title,
    body: groupTreatmentPrayer.body,
    mood: 'sad',
    visibility: 'group',
    identity: 'anonymous',
    authorLabel: 'Group member',
    groupName: 'Friday House Church',
    postedAgo: '54m',
  },
  {
    id: 'grp-3',
    title: groupThanksPrayer.title,
    body: groupThanksPrayer.body,
    mood: 'surprised',
    visibility: 'group',
    identity: 'real_name',
    authorLabel: 'Noah',
    groupName: 'Friday House Church',
    postedAgo: '3h',
  },
];

export const initialReactions: PrayerReaction[] = [
  reaction('pub-1', 'u-2', 'prayer'),
  reaction('pub-1', 'u-3', 'comfort'),
  reaction('pub-2', 'u-4', 'amen'),
  reaction('pub-2', 'u-5', 'love'),
  reaction('pub-3', 'u-6', 'prayer'),
  reaction('grp-1', 'u-7', 'amen'),
  reaction('grp-1', 'u-8', 'love'),
  reaction('grp-2', 'u-9', 'comfort'),
];

export const activeTree: ActiveTree = {
  id: 'active-tree',
  speciesId: 'apple',
  growthPoints: 40,
  startedAt: '2026-05-10T12:00:00.000Z',
};

export const forestCollection: TreeCollectionEntry[] = [
  {
    id: 'forest-1',
    speciesId: 'pear',
    growthPoints: 100,
    startedAt: '2026-04-02T12:00:00.000Z',
    completedAt: '2026-04-12T12:00:00.000Z',
  },
  {
    id: 'forest-2',
    speciesId: 'cedar',
    growthPoints: 100,
    startedAt: '2026-04-14T12:00:00.000Z',
    completedAt: '2026-04-25T12:00:00.000Z',
  },
  {
    id: 'forest-3',
    speciesId: 'cherry_blossom',
    growthPoints: 100,
    startedAt: '2026-04-28T12:00:00.000Z',
    completedAt: '2026-05-08T12:00:00.000Z',
  },
];

export const treeSpeciesById = Object.fromEntries(TREE_SPECIES.map((species) => [species.id, species]));

function reaction(prayerId: string, userId: string, type: ReactionType): PrayerReaction {
  return {
    prayerId,
    userId,
    type,
    reactedAt: '2026-05-19T12:00:00.000Z',
  };
}
