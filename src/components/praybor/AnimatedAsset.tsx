import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  ForestTree,
  FruitToSeedArt,
  GardenStage,
  MoodFace,
  OnboardingArt,
  ReactionIcon,
} from '@/components/praybor/PrayborArtwork';
import { lottieAssetRegistry, type LottieAssetKey } from '@/lib/praybor/lottie-assets';
import type { MoodId, ReactionType, TreeGrowthStage } from '@/lib/praybor/domain';

type AnimatedAssetProps = {
  assetKey: LottieAssetKey;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
  style?: StyleProp<ViewStyle>;
  onComplete?: () => void;
};

export function AnimatedAsset({
  assetKey,
  size = 72,
  style,
}: AnimatedAssetProps) {
  const asset = lottieAssetRegistry[assetKey];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={asset.accessibilityLabel}
      style={[styles.fallback, { width: size, height: size }, style]}>
      {renderFallback(assetKey, size)}
    </View>
  );
}

function renderFallback(assetKey: LottieAssetKey, size: number) {
  if (assetKey.startsWith('mood_')) {
    return <MoodFace mood={assetKey.replace('mood_', '') as MoodId} size={size} />;
  }

  if (assetKey.startsWith('reaction_')) {
    return <ReactionIcon type={assetKey.replace('reaction_', '') as ReactionType} size={size} />;
  }

  if (assetKey.startsWith('onboarding_')) {
    return <OnboardingArt kind={assetKey.replace('onboarding_', '') as never} size={size} />;
  }

  if (assetKey.startsWith('tree_stage_')) {
    return <GardenStage stage={assetKey.replace('tree_stage_', '') as TreeGrowthStage} size={size} />;
  }

  if (assetKey === 'fruit_to_seed') {
    return <FruitToSeedArt size={size} />;
  }

  return <ForestTree species="pear" selected size={size} />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
