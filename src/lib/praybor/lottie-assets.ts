import type { MoodId, ReactionType, TreeGrowthStage } from './domain';

export type LottieAssetKey =
  | `onboarding_${'welcome' | 'board' | 'groups' | 'grow' | 'recap'}`
  | `mood_${MoodId}`
  | `reaction_${ReactionType}`
  | `tree_stage_${TreeGrowthStage}`
  | 'fruit_to_seed'
  | 'forest_highlight';

export type LottieAssetDescriptor = {
  key: LottieAssetKey;
  fallback: string;
  accessibilityLabel: string;
};

export const lottieAssetRegistry: Record<LottieAssetKey, LottieAssetDescriptor> = {
  onboarding_welcome: asset('onboarding_welcome', 'welcome-art', 'PrayBor welcome character animation'),
  onboarding_board: asset('onboarding_board', 'board-art', 'Neighborhood prayer board animation'),
  onboarding_groups: asset('onboarding_groups', 'group-art', 'Private prayer groups animation'),
  onboarding_grow: asset('onboarding_grow', 'grow-art', 'Prayer seed growth animation'),
  onboarding_recap: asset('onboarding_recap', 'recap-art', 'Prayer recap and fruit animation'),

  mood_joy: asset('mood_joy', 'mood-joy', 'Joy mood animation'),
  mood_excitement: asset('mood_excitement', 'mood-excitement', 'Excitement mood animation'),
  mood_gratitude: asset('mood_gratitude', 'mood-gratitude', 'Gratitude mood animation'),
  mood_ordinary: asset('mood_ordinary', 'mood-ordinary', 'Ordinary mood animation'),
  mood_surprised: asset('mood_surprised', 'mood-surprised', 'Surprised mood animation'),
  mood_uncomfortable: asset('mood_uncomfortable', 'mood-uncomfortable', 'Uncomfortable mood animation'),
  mood_exhausted: asset('mood_exhausted', 'mood-exhausted', 'Exhausted mood animation'),
  mood_afraid: asset('mood_afraid', 'mood-afraid', 'Afraid mood animation'),
  mood_sad: asset('mood_sad', 'mood-sad', 'Sad mood animation'),
  mood_angry: asset('mood_angry', 'mood-angry', 'Angry mood animation'),

  reaction_prayer: asset('reaction_prayer', 'reaction-prayer', 'Prayer reaction animation'),
  reaction_amen: asset('reaction_amen', 'reaction-amen', 'Amen reaction animation'),
  reaction_comfort: asset('reaction_comfort', 'reaction-comfort', 'Comfort reaction animation'),
  reaction_love: asset('reaction_love', 'reaction-love', 'Love reaction animation'),

  tree_stage_seed: asset('tree_stage_seed', 'tree-seed', 'Seed stage animation'),
  tree_stage_sprout: asset('tree_stage_sprout', 'tree-sprout', 'Sprout stage animation'),
  tree_stage_small_plant: asset('tree_stage_small_plant', 'tree-small-plant', 'Small plant stage animation'),
  tree_stage_young_tree: asset('tree_stage_young_tree', 'tree-young', 'Young tree stage animation'),
  tree_stage_fruiting_tree: asset('tree_stage_fruiting_tree', 'tree-fruiting', 'Fruiting tree stage animation'),
  tree_stage_completed: asset('tree_stage_completed', 'tree-completed', 'Completed tree animation'),

  fruit_to_seed: asset('fruit_to_seed', 'fruit-to-seed', 'Fruit falling into a new seed animation'),
  forest_highlight: asset('forest_highlight', 'forest-highlight', 'Selected forest tree highlight animation'),
};

function asset(
  key: LottieAssetKey,
  fallback: string,
  accessibilityLabel: string,
): LottieAssetDescriptor {
  return {
    key,
    fallback,
    accessibilityLabel,
  };
}
