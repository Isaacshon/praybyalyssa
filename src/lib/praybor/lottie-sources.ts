import type { LottieAssetKey } from './lottie-assets';
import forestHighlight from '@/assets/lottie/forest_highlight.lottie';
import fruitToSeed from '@/assets/lottie/fruit_to_seed.lottie';
import onboardingBoard from '@/assets/lottie/onboarding_board.lottie';
import onboardingGrow from '@/assets/lottie/onboarding_grow.lottie';
import onboardingWelcome from '@/assets/lottie/onboarding_welcome.lottie';
import reactionLove from '@/assets/lottie/reaction_love.lottie';
import reactionPrayer from '@/assets/lottie/reaction_prayer.lottie';
import treeStageFruitingTree from '@/assets/lottie/tree_stage_fruiting_tree.lottie';
import treeStageSeed from '@/assets/lottie/tree_stage_seed.lottie';
import treeStageSmallPlant from '@/assets/lottie/tree_stage_small_plant.lottie';
import treeStageSprout from '@/assets/lottie/tree_stage_sprout.lottie';
import treeStageYoungTree from '@/assets/lottie/tree_stage_young_tree.lottie';

export const localLottieSources: Partial<Record<LottieAssetKey, number>> = {
  onboarding_welcome: onboardingWelcome,
  onboarding_board: onboardingBoard,
  onboarding_grow: onboardingGrow,
  reaction_prayer: reactionPrayer,
  reaction_love: reactionLove,
  tree_stage_seed: treeStageSeed,
  tree_stage_sprout: treeStageSprout,
  tree_stage_small_plant: treeStageSmallPlant,
  tree_stage_young_tree: treeStageYoungTree,
  tree_stage_fruiting_tree: treeStageFruitingTree,
  fruit_to_seed: fruitToSeed,
  forest_highlight: forestHighlight,
};
