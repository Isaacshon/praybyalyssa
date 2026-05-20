import { DotLottie, type Dotlottie } from '@lottiefiles/dotlottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
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
import { localLottieSources } from '@/lib/praybor/lottie-sources';
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
  loop = false,
  autoplay = true,
  style,
  onComplete,
}: AnimatedAssetProps) {
  const asset = lottieAssetRegistry[assetKey];
  const source = localLottieSources[assetKey];
  const ref = useRef<Dotlottie>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  if (Platform.OS === 'web' || reduceMotion || loadFailed || !source) {
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

  return (
    <DotLottie
      ref={ref}
      source={source}
      loop={loop}
      autoplay={autoplay}
      onLoadError={() => setLoadFailed(true)}
      onComplete={onComplete}
      style={StyleSheet.flatten([{ width: size, height: size }, style])}
    />
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
