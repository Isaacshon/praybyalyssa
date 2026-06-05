import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlessiLogo } from '@/components/praybor/BlessiLogo';
import { ReactionIcon, UtilityIcon } from '@/components/praybor/PrayborArtwork';
import {
  ANIMAL_COMPANIONS,
  countFruitBearingTrees,
  getNextSelectedAnimalCompanionIds,
  getUnlockedAnimalCompanions,
  normalizeSelectedAnimalCompanionIds,
  selectRoamingAnimalCompanions,
  toggleSelectedAnimalCompanionId,
  type AnimalCompanion,
} from '@/lib/praybor/animal-companions';
import {
  GROW_MAP_AREA_DEFINITIONS,
  getGrowMapAreaSelectionStatus,
  isGrowMapAreaUnlocked,
} from '@/lib/praybor/grow-map-areas';
import { loadGrowPreferences, persistGrowPreferences } from '@/lib/praybor/grow-preferences';
import {
  shouldKeepOpenedOverlayMounted,
  shouldWarmGrowOverlayAssets,
  shouldTreatSceneAssetsAsReady,
  shouldRenderGrowSceneContent,
  shouldRenderForestRoamingAnimals,
  shouldRenderRoamingAnimals,
} from '@/lib/praybor/grow-render-state';
import { isTreeSpeciesUnlocked } from '@/lib/praybor/grow-collection-unlocks';
import {
  ROAMING_ANIMAL_FACING_FRAME,
  getRoamingAnimalInitialDelayMs,
  getRoamingAnimalInitialStep,
  getRoamingAnimalIdleDelayMs,
  getRoamingAnimalLayerOffsetY,
  getRoamingAnimalMove,
  getRoamingAnimalMotionChunkDurationMs,
  getRoamingAnimalMovementProgress,
  getRoamingAnimalMotionState,
  getRoamingAnimalNextRestWalkCount,
  getRoamingAnimalPoint,
  getRoamingAnimalPose,
  getRoamingAnimalTurnDelayMs,
  type RoamingAnimalArea,
  type RoamingAnimalDirectionScaleX,
  type RoamingAnimalPose,
} from '@/lib/praybor/animal-roaming';
import {
  FOREST_DIORAMA_BOARD_HEIGHT,
  FOREST_DIORAMA_BOARD_WIDTH,
  FOREST_DIORAMA_SLOTS,
  getForestDioramaAnimalLayerZIndex,
  getForestDioramaScaledSlotMetrics,
} from '@/lib/praybor/diorama-layout';
import {
  getForestDioramaThemeTreeWindow,
  getForestDioramaTreeMotion,
} from '@/lib/praybor/diorama-motion';
import {
  getAnimalCompanionImageFrameScaleX,
  getAnimalCompanionImageScale,
  getAnimalCompanionPoseSwitchDelayMs,
} from '@/lib/praybor/animal-presentation';
import {
  COMPLETE_GROWTH_POINTS,
  TREE_SPECIES,
  getGrowthStage,
  type ActiveTree,
  type TreeGrowthStage,
} from '@/lib/praybor/domain';
import {
  getBlessieGrowPreviewCompletedTreeCount,
  getBlessieGrowPreviewTree,
} from '@/lib/praybor/dev-preview';
import {
  ANIMAL_COMPANION_IMAGE_ASSETS,
  ANIMAL_COMPANION_PREVIEW_IMAGES,
  FOREST_FLAT_MAP_IMAGE,
  GROW_MAP_GUIDE_IMAGES,
  GROW_MAP_PREVIEW_IMAGES,
  GROW_MAP_SCENE_ASSETS,
  TREE_STAGE_IMAGES_BY_SPECIES,
  TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES,
  fieldImage,
  forestLeafLayerImage,
  forestTreeLayerImage,
  getGrowImageUri,
  preloadGrowImageSources,
  preloadGrowScreenAssets,
} from '@/lib/praybor/grow-assets';
import { getActiveTreeSnapshot, subscribeToActiveTree, updateTreeGrowthAsAdmin } from '@/lib/praybor/growth-state';
import {
  fetchPersistedCompletedTreeCount,
  subscribeToCurrentUserAdminStatus,
} from '@/lib/praybor/tree-growth-persistence';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);
const collectionIconSources: Record<CollectionKind, ImageSourcePropType> = {
  tree: require('../../../assets/images/praybor/collection/tree-book.png'),
  animal: require('../../../assets/images/praybor/collection/animal-book.png'),
};

const pullTabShadow = Platform.select({
  web: { boxShadow: '0 7px 18px rgba(255, 102, 40, 0.25)' },
  default: {
    shadowColor: '#FF6628',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
});
const sheetContentShadow = Platform.select({
  web: { boxShadow: '0 -9px 22px rgba(42, 28, 19, 0.14)' },
  default: {
    shadowColor: '#2a1c13',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -9 },
    elevation: 8,
  },
});
const stageProgressCardShadow = Platform.select({
  web: { boxShadow: '0 3px 8px rgba(224, 143, 66, 0.15)' },
  default: {
    shadowColor: '#E08F42',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});
const SHEET_CLOSED_TRANSLATE = 306;
const SHEET_OPEN_DISTANCE = SHEET_CLOSED_TRANSLATE;
const BREEZE_INPUT_RANGE = [0, 0.28, 0.5, 0.74, 1];
const TWINKLE_INPUT_RANGE = [0, 0.16, 0.36, 0.58, 0.78, 1];
const COLLECTION_DEX_GRID_HORIZONTAL_PADDING = 12;
const COLLECTION_DEX_GRID_GAP = 8;
const USE_NATIVE_ANIMATION_DRIVER = Platform.OS !== 'web';
const NIGHT_SKY_SPARKLES = [
  { id: 'north-west', x: 11, y: 6, size: 3, phase: 0 },
  { id: 'upper-left', x: 22, y: 13, size: 2, phase: 1 },
  { id: 'moon-left', x: 36, y: 8, size: 2, phase: 2 },
  { id: 'moon-right', x: 57, y: 9, size: 3, phase: 0 },
  { id: 'far-right', x: 83, y: 5, size: 2, phase: 1 },
  { id: 'cloud-right', x: 76, y: 17, size: 4, phase: 2 },
  { id: 'mid-left', x: 17, y: 24, size: 2, phase: 2 },
  { id: 'center-high', x: 48, y: 23, size: 3, phase: 1 },
  { id: 'mid-right', x: 68, y: 28, size: 2, phase: 0 },
  { id: 'low-left', x: 28, y: 36, size: 2, phase: 1 },
  { id: 'low-center', x: 54, y: 34, size: 2, phase: 2 },
  { id: 'low-right', x: 88, y: 32, size: 3, phase: 0 },
] as const;
type CollectionKind = 'tree' | 'animal';
type SheetActionKind = 'forest' | 'map' | 'collection';
type GrowMapSceneAsset = (typeof GROW_MAP_SCENE_ASSETS)[keyof typeof GROW_MAP_SCENE_ASSETS];

const DEFAULT_FOREST_SCENE_ASSET = {
  id: 'forest',
  guideImage: fieldImage,
  backgroundImage: fieldImage,
  stillLayerImage: forestTreeLayerImage,
  breezeLayerImage: forestLeafLayerImage,
} satisfies GrowMapSceneAsset;

function getGrowMapSceneAsset(sceneId: string) {
  return sceneId === 'forest'
    ? DEFAULT_FOREST_SCENE_ASSET
    : GROW_MAP_SCENE_ASSETS[sceneId as keyof typeof GROW_MAP_SCENE_ASSETS];
}

const GROW_MAP_AREAS = GROW_MAP_AREA_DEFINITIONS.map((area) => ({
  ...area,
  image: GROW_MAP_PREVIEW_IMAGES[area.guideImageId] ?? GROW_MAP_GUIDE_IMAGES[area.guideImageId],
  scene: getGrowMapSceneAsset(area.sceneId),
}));
const TREE_LEAF_LAYER_RATIOS: Record<TreeGrowthStage, number> = {
  seed: 0.62,
  sprout: 0.68,
  small_plant: 0.74,
  young_tree: 0.8,
  fruiting_tree: 0.84,
  completed: 0.84,
};
const TREE_STAGE_SIZE_FACTORS: Record<TreeGrowthStage, number> = {
  seed: 0.43,
  sprout: 0.56,
  small_plant: 0.7,
  young_tree: 0.86,
  fruiting_tree: 1,
  completed: 1,
};
const FOREST_FLAT_MAP = {
  id: 'forest-flat-grid',
  backgroundColor: '#111722',
  image: FOREST_FLAT_MAP_IMAGE,
} as const;
const FOREST_DIORAMA_PAN_LIMIT_X = 32;
const FOREST_DIORAMA_PAN_LIMIT_Y = 68;
const FOREST_DIORAMA_MIN_ZOOM = 1;
const FOREST_DIORAMA_MAX_ZOOM = 1.65;
const FOREST_DIORAMA_ZOOM_EXTRA_PAN_X = 116;
const FOREST_DIORAMA_ZOOM_EXTRA_PAN_Y = 174;
const STAGE_PROGRESS_RANGES: Record<TreeGrowthStage, { start: number; end: number }> = {
  seed: { start: 0, end: 1 },
  sprout: { start: 1, end: 3 },
  small_plant: { start: 3, end: 5 },
  young_tree: { start: 5, end: 6 },
  fruiting_tree: { start: 6, end: COMPLETE_GROWTH_POINTS },
  completed: { start: COMPLETE_GROWTH_POINTS, end: COMPLETE_GROWTH_POINTS },
};
type GrowthVerse = { theme: string; excerpt: string; reference: string };

const TREE_GROWTH_VERSES: readonly GrowthVerse[] = [
  {
    theme: "God's work",
    excerpt: 'He who began a good work in you will bring it to completion.',
    reference: 'Philippians 1:6 ESV',
  },
  {
    theme: "God's help",
    excerpt: 'My help comes from the LORD.',
    reference: 'Psalm 121:2 ESV',
  },
  {
    theme: "God's faithfulness",
    excerpt: 'Great is your faithfulness.',
    reference: 'Lamentations 3:23 ESV',
  },
  {
    theme: "God's love",
    excerpt: 'The love of God in Christ Jesus our Lord.',
    reference: 'Romans 8:39 ESV',
  },
  {
    theme: 'Fruit of prayer',
    excerpt: 'Whoever abides in me bears much fruit.',
    reference: 'John 15:5 ESV',
  },
  {
    theme: 'Shelter and rest',
    excerpt: 'The LORD is my shepherd; I shall not want.',
    reference: 'Psalm 23:1 ESV',
  },
  {
    theme: 'Peace of God',
    excerpt: 'The peace of God will guard your hearts.',
    reference: 'Philippians 4:7 ESV',
  },
  {
    theme: 'New mercy',
    excerpt: 'His mercies never come to an end.',
    reference: 'Lamentations 3:22 ESV',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getStableTreeVerseKey(tree: ActiveTree | null, speciesId: string) {
  return tree ? `tree:${tree.id}` : `species:${speciesId}`;
}

function getStableTreeVerse(key: string): GrowthVerse {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  return TREE_GROWTH_VERSES[hash % TREE_GROWTH_VERSES.length];
}

function getWheelScrollIndex(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  snapInterval: number,
  itemCount: number,
) {
  return clamp(Math.round(event.nativeEvent.contentOffset.x / snapInterval), 0, itemCount - 1);
}

function getBundledGrowImageSource(source: ImageSourcePropType): ImageSourcePropType {
  return source;
}

function isGrowImageSource(source: ImageSourcePropType | null | undefined): source is ImageSourcePropType {
  return Boolean(source);
}

function getGrowImageSourceSignature(source: ImageSourcePropType) {
  return getGrowImageUri(source) ?? `source:${String(source)}`;
}

function getUniqueGrowImageSources(sources: readonly ImageSourcePropType[]) {
  const seen = new Set<string>();
  const uniqueSources: ImageSourcePropType[] = [];

  for (const source of sources) {
    const signature = getGrowImageSourceSignature(source);

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    uniqueSources.push(source);
  }

  return uniqueSources;
}

function treeStageIndex(stage: TreeGrowthStage) {
  switch (stage) {
    case 'seed':
      return 0;
    case 'sprout':
      return 1;
    case 'small_plant':
      return 2;
    case 'young_tree':
      return 3;
    case 'fruiting_tree':
    case 'completed':
      return 4;
  }
}

function getStageLabel(stage: TreeGrowthStage, treeSpeciesLabel: string) {
  switch (stage) {
    case 'seed':
      return 'Seed';
    case 'sprout':
      return 'Sprout';
    case 'small_plant':
    case 'young_tree':
      return 'Young tree';
    case 'fruiting_tree':
      return 'Blooming tree';
    case 'completed':
      return treeSpeciesLabel;
  }
}

function getStageProgressPercent(growthPoints: number, stage: TreeGrowthStage) {
  const range = STAGE_PROGRESS_RANGES[stage];
  const span = range.end - range.start;

  if (span <= 0) {
    return 100;
  }

  return Math.round(clamp(((growthPoints - range.start) / span) * 100, 0, 100));
}

function getSpeciesLabel(speciesId: string) {
  return TREE_SPECIES.find((species) => species.id === speciesId)?.label ?? 'Blessie Tree';
}

function formatTreeStartedDate(value?: string) {
  if (!value) {
    return 'Not planted yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not planted yet';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function countGrowthEvents(tree: ActiveTree | null, type: 'prayer_posted' | 'reaction_given') {
  return (tree?.growthEvents ?? []).filter((event) => event.type === type).length;
}

function clampForestDioramaZoom(value: number) {
  return clamp(value, FOREST_DIORAMA_MIN_ZOOM, FOREST_DIORAMA_MAX_ZOOM);
}

function getForestDioramaPanLimits(zoom: number) {
  const zoomProgress =
    (clampForestDioramaZoom(zoom) - FOREST_DIORAMA_MIN_ZOOM) /
    (FOREST_DIORAMA_MAX_ZOOM - FOREST_DIORAMA_MIN_ZOOM);

  return {
    x: FOREST_DIORAMA_PAN_LIMIT_X + FOREST_DIORAMA_ZOOM_EXTRA_PAN_X * zoomProgress,
    y: FOREST_DIORAMA_PAN_LIMIT_Y + FOREST_DIORAMA_ZOOM_EXTRA_PAN_Y * zoomProgress,
  };
}

function clampForestDioramaPanOffset({
  offset,
  zoom,
}: {
  offset: { x: number; y: number };
  zoom: number;
}) {
  const limits = getForestDioramaPanLimits(zoom);

  return {
    x: clamp(offset.x, -limits.x, limits.x),
    y: clamp(offset.y, -limits.y, limits.y),
  };
}

function getForestDioramaTouches(event: GestureResponderEvent) {
  return event.nativeEvent.touches ?? [];
}

function getForestDioramaPinchDistance(event: GestureResponderEvent) {
  const touches = getForestDioramaTouches(event);

  if (touches.length < 2) {
    return null;
  }

  const [firstTouch, secondTouch] = touches;

  return Math.hypot(
    firstTouch.pageX - secondTouch.pageX,
    firstTouch.pageY - secondTouch.pageY,
  );
}

function getForestDioramaPinchCenter(event: GestureResponderEvent) {
  const touches = getForestDioramaTouches(event);

  if (touches.length < 2) {
    return null;
  }

  const [firstTouch, secondTouch] = touches;

  return {
    x: (firstTouch.pageX + secondTouch.pageX) / 2,
    y: (firstTouch.pageY + secondTouch.pageY) / 2,
  };
}

function ForestDioramaBoard({
  source,
}: {
  source: ImageSourcePropType;
}) {
  return (
    <ExpoImage
      accessibilityIgnoresInvertColors
      accessible={false}
      pointerEvents="none"
      source={source}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority="high"
      recyclingKey={`forest-diorama-board-${String(source)}`}
      style={styles.forestDioramaBoardImage}
    />
  );
}

type ForestDioramaTreeEntry = {
  id: string;
  image: ImageSourcePropType;
  title: string;
};

function ForestDioramaTreeSlot({
  breeze,
  entry,
  index,
  slotMetrics,
}: {
  breeze: Animated.Value;
  entry: ForestDioramaTreeEntry;
  index: number;
  slotMetrics: ReturnType<typeof getForestDioramaScaledSlotMetrics>;
}) {
  const touchJolt = useRef(new Animated.Value(0)).current;
  const treeMotion = getForestDioramaTreeMotion({ slotIndex: index });
  const treeDirection = treeMotion.direction;
  const treeRotate = breeze.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      '0deg',
      `${treeMotion.rotateDeg * treeDirection}deg`,
      '0deg',
      `${-treeMotion.rotateDeg * treeDirection}deg`,
      '0deg',
    ],
  });
  const treeTranslateX = breeze.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      0,
      treeMotion.translateX * treeDirection,
      0,
      -treeMotion.translateX * treeDirection,
      0,
    ],
  });
  const treeTranslateY = breeze.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -treeMotion.translateY, 0],
  });
  const joltScale = touchJolt.interpolate({
    inputRange: [0, 0.28, 0.62, 1],
    outputRange: [1, 1.08, 0.975, 1],
  });
  const joltRotate = touchJolt.interpolate({
    inputRange: [0, 0.24, 0.58, 1],
    outputRange: ['0deg', '-3deg', '2.2deg', '0deg'],
  });
  const joltTranslateY = touchJolt.interpolate({
    inputRange: [0, 0.28, 0.62, 1],
    outputRange: [0, -4, 1.5, 0],
  });

  const handleTreePressIn = useCallback(() => {
    touchJolt.stopAnimation();
    touchJolt.setValue(0);
    Animated.sequence([
      Animated.timing(touchJolt, {
        toValue: 0.55,
        duration: 105,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.timing(touchJolt, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        touchJolt.setValue(0);
      }
    });
  }, [touchJolt]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.forestDioramaSlot,
        {
          height: slotMetrics.height,
          left: `${slotMetrics.left}%`,
          top: `${slotMetrics.top}%`,
          width: slotMetrics.width,
          zIndex: slotMetrics.zIndex,
          transform: [
            { translateX: slotMetrics.translateX },
            { translateY: slotMetrics.translateY },
          ],
        },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.forestDioramaPlantShadow,
          {
            bottom: slotMetrics.treeRootOffsetY - 4,
            width: Math.max(16, slotMetrics.treeWidth * 0.4),
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.title} tree`}
        android_disableSound
        hitSlop={8}
        onPressIn={handleTreePressIn}
        style={styles.forestDioramaTreePressable}>
        <Animated.View
          style={[
            styles.forestDioramaTree,
            {
              height: slotMetrics.treeHeight,
              width: slotMetrics.treeWidth,
              transform: [
                { translateX: treeTranslateX },
                { translateY: treeTranslateY },
                { translateY: joltTranslateY },
                { rotate: treeRotate },
                { rotate: joltRotate },
                { scale: joltScale },
              ],
            },
          ]}>
          <ExpoImage
            accessibilityIgnoresInvertColors
            source={entry.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={`diorama-tree-${entry.id}`}
            style={styles.forestDioramaTreeImage}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function HiddenGrowImageWarmers({
  enabled,
  idPrefix,
  sources,
}: {
  enabled: boolean;
  idPrefix: string;
  sources: readonly ImageSourcePropType[];
}) {
  const uniqueSources = useMemo(() => getUniqueGrowImageSources(sources), [sources]);

  if (!enabled || uniqueSources.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.hiddenGrowImageWarmers}>
      {uniqueSources.map((source, index) => {
        const signature = getGrowImageSourceSignature(source);

        return (
          <ExpoImage
            key={`${idPrefix}-${signature}`}
            accessibilityIgnoresInvertColors
            accessible={false}
            source={source}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={`${idPrefix}-${index}`}
            style={styles.hiddenGrowImageWarmer}
          />
        );
      })}
    </View>
  );
}

function CollectionSilhouette({
  kind,
  source,
}: {
  kind: CollectionKind;
  source?: ImageSourcePropType | null;
}) {
  if (source) {
    return (
      <View style={styles.collectionSilhouetteWrap}>
        <ExpoImage
          accessibilityIgnoresInvertColors
          source={source}
          contentFit="contain"
          cachePolicy="memory-disk"
          tintColor="#1F1711"
          style={[
            styles.collectionSilhouetteImage,
            kind === 'animal' && styles.collectionSilhouetteAnimalImage,
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.collectionSilhouetteWrap}>
      <View
        style={[
          styles.collectionSilhouetteBody,
          kind === 'tree' ? styles.treeSilhouetteBody : styles.animalSilhouetteBody,
        ]}
      />
      {kind === 'tree' ? <View style={styles.treeSilhouetteTrunk} /> : <View style={styles.animalSilhouetteEar} />}
    </View>
  );
}

function RoamingAnimal({
  area = 'grow',
  bottom,
  companion,
  imageAssets,
  index,
  layerZIndex,
  maxVisualWidth,
  previewImage,
  reduceMotion,
  sceneHeight,
  sceneWidth,
  size,
  top,
}: {
  area?: RoamingAnimalArea;
  bottom?: number;
  companion: AnimalCompanion;
  imageAssets: {
    walkingImage: ImageSourcePropType;
    idleImage: ImageSourcePropType;
  };
  index: number;
  layerZIndex?: number;
  maxVisualWidth?: number;
  previewImage?: ImageSourcePropType | null;
  reduceMotion: boolean;
  sceneHeight?: number;
  sceneWidth: number;
  size: number;
  top?: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const directionScale = useRef(new Animated.Value(1)).current;
  const walkingOpacity = useRef(new Animated.Value(0)).current;
  const idleOpacity = useRef(new Animated.Value(1)).current;
  const poseRef = useRef<RoamingAnimalPose>('idle');
  const poseStartedAtMsRef = useRef(Date.now());
  const poseTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkingCycleStartedAtMsRef = useRef(Date.now());
  const walkingImageReadyRef = useRef(false);
  const [pose, setPose] = useState<RoamingAnimalPose>('idle');
  const walkingImageScale = getAnimalCompanionImageScale({
    companionId: companion.id,
    pose: 'walking',
  });
  const walkingImageFrameScaleX = getAnimalCompanionImageFrameScaleX({
    companionId: companion.id,
    pose: 'walking',
  });
  const idleImageScale = getAnimalCompanionImageScale({
    companionId: companion.id,
    pose: 'idle',
  });
  const idleImageFrameScaleX = getAnimalCompanionImageFrameScaleX({
    companionId: companion.id,
    pose: 'idle',
  });
  const walkingFrameWidthPercent = maxVisualWidth
    ? Math.min(walkingImageFrameScaleX * 100, (maxVisualWidth / size) * 100)
    : walkingImageFrameScaleX * 100;
  const idleFrameWidthPercent = maxVisualWidth
    ? Math.min(idleImageFrameScaleX * 100, (maxVisualWidth / size) * 100)
    : idleImageFrameScaleX * 100;

  const clearScheduledPoseChange = useCallback(() => {
    if (poseTransitionTimeoutRef.current) {
      clearTimeout(poseTransitionTimeoutRef.current);
      poseTransitionTimeoutRef.current = null;
    }
  }, []);

  const markWalkingImageDisplayed = useCallback(() => {
    if (walkingImageReadyRef.current) {
      return;
    }

    walkingImageReadyRef.current = true;
    walkingCycleStartedAtMsRef.current = Date.now();
  }, []);

  useEffect(() => {
    walkingImageReadyRef.current = false;
    walkingCycleStartedAtMsRef.current = Date.now();
  }, [companion.id, imageAssets.walkingImage]);

  const commitPoseChange = useCallback(
    (nextPose: RoamingAnimalPose) => {
      clearScheduledPoseChange();

      if (poseRef.current === nextPose) {
        return;
      }

      poseRef.current = nextPose;
      poseStartedAtMsRef.current = Date.now();
      setPose(nextPose);
    },
    [clearScheduledPoseChange],
  );

  const requestPoseChange = useCallback(
    (nextPose: RoamingAnimalPose, onReady?: () => void) => {
      clearScheduledPoseChange();

      if (poseRef.current === nextPose) {
        onReady?.();
        return;
      }

      const delayMs = getAnimalCompanionPoseSwitchDelayMs({
        companionId: companion.id,
        currentPose: poseRef.current,
        elapsedMs: Date.now() - poseStartedAtMsRef.current,
        reduceMotion,
      });
      const applyPoseChange = () => {
        poseTransitionTimeoutRef.current = null;
        poseRef.current = nextPose;
        poseStartedAtMsRef.current = Date.now();
        setPose(nextPose);
        onReady?.();
      };

      if (delayMs <= 0) {
        applyPoseChange();
        return;
      }

      poseTransitionTimeoutRef.current = setTimeout(applyPoseChange, delayMs);
    },
    [clearScheduledPoseChange, companion.id, reduceMotion],
  );

  useEffect(() => {
    const transitionDurationMs = 0;

    Animated.parallel([
      Animated.timing(walkingOpacity, {
        toValue: pose === 'walking' ? 1 : 0,
        duration: transitionDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
      Animated.timing(idleOpacity, {
        toValue: pose === 'idle' ? 1 : 0,
        duration: transitionDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }),
    ]).start();
  }, [idleOpacity, pose, reduceMotion, walkingOpacity]);

  useEffect(() => {
    let mounted = true;
    let idleTimeout: ReturnType<typeof setTimeout> | null = null;
    let turnTimeout: ReturnType<typeof setTimeout> | null = null;
    let motionTimeout: ReturnType<typeof setTimeout> | null = null;
    let step = getRoamingAnimalInitialStep({ area, index });
    let previousDirectionScaleX: RoamingAnimalDirectionScaleX | null = null;
    let restCycle = 0;
    let completedWalksSinceRest = 0;
    let nextRestWalkCount = getRoamingAnimalNextRestWalkCount({
      area,
      companionId: companion.id,
      cycle: restCycle,
      index,
    });
    const firstPoint = getRoamingAnimalPoint({
      area,
      companionId: companion.id,
      index,
      sceneHeight,
      sceneWidth,
      size,
      step,
    });

    translateX.setValue(firstPoint.x);
    translateY.setValue(firstPoint.y);

    if (reduceMotion) {
      commitPoseChange('idle');
      directionScale.setValue(index % 2 === 0 ? 1 : -1);

      return () => {
        mounted = false;
        clearScheduledPoseChange();
      };
    }

    const clearRoamTimeout = () => {
      if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
      }

      if (turnTimeout) {
        clearTimeout(turnTimeout);
        turnTimeout = null;
      }

      if (motionTimeout) {
        clearTimeout(motionTimeout);
        motionTimeout = null;
      }
    };
    const scheduleNextMove = () => {
      const fromPoint = getRoamingAnimalPoint({
        area,
        companionId: companion.id,
        index,
        sceneHeight,
        sceneWidth,
        size,
        step,
      });
      const toPoint = getRoamingAnimalPoint({
        area,
        companionId: companion.id,
        index,
        sceneHeight,
        sceneWidth,
        size,
        step: step + 1,
      });
      const move = getRoamingAnimalMove({
        area,
        companionId: companion.id,
        from: fromPoint,
        size,
        to: toPoint,
      });
      const resting = step > 0 && completedWalksSinceRest >= nextRestWalkCount;
      const idleDelay = getRoamingAnimalIdleDelayMs({ area, index, resting, step });
      const firstWalkDelay = getRoamingAnimalInitialDelayMs({ area, index });
      let segmentProgress = 0;

      clearRoamTimeout();
      const finishMove = () => {
        step += 1;
        completedWalksSinceRest += 1;
        scheduleNextMove();
      };
      const animateMove = () => {
        if (!mounted) {
          return;
        }

        if (!walkingImageReadyRef.current) {
          requestPoseChange(getRoamingAnimalPose({ walking: true }));
          motionTimeout = setTimeout(animateMove, 50);

          return;
        }

        const motionState = getRoamingAnimalMotionState({
          companionId: companion.id,
          elapsedMs: Date.now() - walkingCycleStartedAtMsRef.current,
        });

        if (!motionState.moving) {
          requestPoseChange(getRoamingAnimalPose({ walking: true }));
          motionTimeout = setTimeout(
            animateMove,
            Math.max(50, motionState.waitMs),
          );

          return;
        }

        const remainingMoveDurationMs = Math.max(
          0,
          Math.round(move.durationMs * (1 - segmentProgress)),
        );

        if (remainingMoveDurationMs <= 0) {
          finishMove();

          return;
        }

        requestPoseChange(getRoamingAnimalPose({ walking: true }));
        const chunkDurationMs = getRoamingAnimalMotionChunkDurationMs({
          remainingMoveDurationMs,
          remainingMovingMs: motionState.remainingMovingMs,
        });
        const nextProgress = Math.min(
          1,
          segmentProgress + chunkDurationMs / move.durationMs,
        );
        const nextMovementProgress = getRoamingAnimalMovementProgress(nextProgress);
        const nextX = Math.round(fromPoint.x + move.deltaX * nextMovementProgress);
        const nextY = Math.round(fromPoint.y + move.deltaY * nextMovementProgress);

        Animated.parallel([
          Animated.timing(translateX, {
            toValue: nextX,
            duration: chunkDurationMs,
            easing: Easing.linear,
            useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
          }),
          Animated.timing(translateY, {
            toValue: nextY,
            duration: chunkDurationMs,
            easing: Easing.linear,
            useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
          }),
        ]).start(({ finished }) => {
          if (!finished || !mounted) {
            return;
          }

          segmentProgress = nextProgress;

          if (segmentProgress >= 1) {
            finishMove();

            return;
          }

          animateMove();
        });
      };
      const startWalking = ({ wasIdle }: { wasIdle: boolean }) => {
        if (!mounted) {
          return;
        }

        requestPoseChange(getRoamingAnimalPose({ walking: true }), () => {
          if (!mounted) {
            return;
          }

          directionScale.setValue(move.directionScaleX);
          const turnDelay = getRoamingAnimalTurnDelayMs({
            previousDirectionScaleX,
            nextDirectionScaleX: move.directionScaleX,
            wasIdle,
          });
          previousDirectionScaleX = move.directionScaleX;

          if (turnDelay === 0) {
            animateMove();

            return;
          }

          turnTimeout = setTimeout(() => {
            if (!mounted) {
              return;
            }

            animateMove();
          }, turnDelay);
        });
      };

      if (resting) {
        requestPoseChange(getRoamingAnimalPose({ walking: false }), () => {
          if (!mounted) {
            return;
          }

          idleTimeout = setTimeout(() => {
            completedWalksSinceRest = 0;
            restCycle += 1;
            nextRestWalkCount = getRoamingAnimalNextRestWalkCount({
              area,
              companionId: companion.id,
              cycle: restCycle,
              index,
            });
            startWalking({ wasIdle: true });
          }, idleDelay);
        });

        return;
      }

      const wasIdle = previousDirectionScaleX === null;
      idleTimeout = setTimeout(
        () => startWalking({ wasIdle }),
        wasIdle ? firstWalkDelay : idleDelay,
      );
    };

    scheduleNextMove();

    return () => {
      mounted = false;
      clearRoamTimeout();
      clearScheduledPoseChange();
      translateX.stopAnimation();
      translateY.stopAnimation();
    };
  }, [
    clearScheduledPoseChange,
    commitPoseChange,
    area,
    companion.id,
    directionScale,
    index,
    reduceMotion,
    requestPoseChange,
    sceneHeight,
    sceneWidth,
    size,
    translateX,
    translateY,
  ]);

  const verticalPositionStyle =
    area === 'forest'
      ? { top: top ?? 0 }
      : { bottom: bottom ?? 0 };

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.roamingAnimalWrap,
        verticalPositionStyle,
        {
          width: size,
          height: size,
          zIndex: layerZIndex,
          transform: [{ translateX }, { translateY }],
        },
      ]}>
      <View style={styles.roamingAnimalFacing}>
        <Animated.View
          style={[
            styles.roamingAnimalPoseLayer,
            {
              opacity: walkingOpacity,
              transform: [{ scaleX: directionScale }],
            },
        ]}>
          <ExpoImage
            accessibilityIgnoresInvertColors
            source={imageAssets.walkingImage}
            placeholder={previewImage}
            placeholderContentFit="contain"
            contentFit="contain"
            cachePolicy="memory-disk"
            onDisplay={markWalkingImageDisplayed}
            priority="high"
            recyclingKey={`roaming-${companion.id}-walking`}
            style={[
              styles.roamingAnimalImage,
              walkingFrameWidthPercent !== 100 && {
                alignSelf: 'center',
                width: `${walkingFrameWidthPercent}%`,
              },
              walkingImageScale !== 1 && { transform: [{ scale: walkingImageScale }] },
            ]}
            accessibilityLabel={companion.label}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.roamingAnimalPoseLayer,
            { opacity: idleOpacity },
        ]}>
          <ExpoImage
            accessibilityIgnoresInvertColors
            source={imageAssets.idleImage}
            placeholder={previewImage}
            placeholderContentFit="contain"
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={`roaming-${companion.id}-idle`}
            style={[
              styles.roamingAnimalImage,
              idleFrameWidthPercent !== 100 && {
                alignSelf: 'center',
                width: `${idleFrameWidthPercent}%`,
              },
              idleImageScale !== 1 && { transform: [{ scale: idleImageScale }] },
            ]}
            accessibilityLabel={companion.label}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function SheetActionIcon({
  kind,
}: {
  kind: SheetActionKind;
}) {
  if (kind === 'forest') {
    return (
      <View style={styles.sheetActionIcon}>
        <ReactionIcon type="mission" size={31} color="#513c25" />
      </View>
    );
  }

  if (kind === 'map') {
    return (
      <View style={styles.sheetActionIcon}>
        <UtilityIcon type="sliders" size={31} color="#513c25" />
      </View>
    );
  }

  return (
    <View style={styles.sheetActionIcon}>
      <ExpoImage
        accessibilityIgnoresInvertColors
        source={collectionIconSources.tree}
        style={styles.sheetActionIconImage}
        contentFit="contain"
      />
    </View>
  );
}

function SheetActionButton({
  kind,
  title,
  onPress,
}: {
  kind: SheetActionKind;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sheetActionTile, pressed && styles.sheetActionTilePressed]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}>
      <SheetActionIcon kind={kind} />
      <View style={styles.sheetActionCopy}>
        <Text style={styles.sheetActionTitle}>{title}</Text>
      </View>
    </Pressable>
  );
}

function OverlayHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.overlayHeader}>
      <View style={styles.overlayHeaderSpacer} />
      <Text style={styles.overlayHeaderTitle}>{title}</Text>
      <Pressable
        style={styles.overlayCloseButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
        accessibilityHint={`Closes the ${title} screen.`}>
        <Text style={styles.overlayCloseText}>×</Text>
      </Pressable>
    </View>
  );
}

export function GrowScreen() {
  const { height, width } = useWindowDimensions();
  const growPreviewTree = useMemo(() => getBlessieGrowPreviewTree(), []);
  const growPreviewCompletedTreeCount = useMemo(
    () => getBlessieGrowPreviewCompletedTreeCount(),
    [],
  );
  const [tree, setTree] = useState<ActiveTree | null>(
    growPreviewTree ?? getActiveTreeSnapshot,
  );
  const [treeSnapshotReady, setTreeSnapshotReady] = useState(
    () => Boolean(growPreviewTree ?? getActiveTreeSnapshot()),
  );
  const [sceneLayers, setSceneLayers] = useState<GrowMapSceneAsset>(DEFAULT_FOREST_SCENE_ASSET);
  const [showNextScene, setShowNextScene] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<CollectionKind | null>(null);
  const [lastCollectionKind, setLastCollectionKind] = useState<CollectionKind>('tree');
  const [selectedCollectionSlot, setSelectedCollectionSlot] = useState<number | null>(null);
  const [selectedTreeStageIndex, setSelectedTreeStageIndex] = useState(4);
  const [completedTreeCount, setCompletedTreeCount] = useState(growPreviewCompletedTreeCount);
  const [forestVisible, setForestVisible] = useState(false);
  const [forestHasOpened, setForestHasOpened] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapHasOpened, setMapHasOpened] = useState(false);
  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [collectionHasOpened, setCollectionHasOpened] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminStatusReady, setAdminStatusReady] = useState(false);
  const [completedTreeCountReady, setCompletedTreeCountReady] = useState(Boolean(growPreviewTree));
  const [growPreferencesReady, setGrowPreferencesReady] = useState(false);
  const [currentGrowAssetsReadyKey, setCurrentGrowAssetsReadyKey] = useState<string | null>(null);
  const [currentRoamingAnimalAssetsReadyKey, setCurrentRoamingAnimalAssetsReadyKey] = useState<
    string | null
  >(null);
  const [forestRoamingAnimalAssetsReadyKey, setForestRoamingAnimalAssetsReadyKey] = useState<
    string | null
  >(null);
  const [growSceneHasRendered, setGrowSceneHasRendered] = useState(false);
  const [forestDioramaSceneHasRendered, setForestDioramaSceneHasRendered] = useState(false);
  const [forestDioramaAssetsReadyKey, setForestDioramaAssetsReadyKey] = useState<string | null>(
    null,
  );
  const [forestDioramaBoardWidth, setForestDioramaBoardWidth] = useState(() =>
    Math.min(470, Math.max(FOREST_DIORAMA_BOARD_WIDTH, width * 1.1)),
  );
  const [forestDioramaBoardHeight, setForestDioramaBoardHeight] = useState(() =>
    Math.round(
      (Math.min(470, Math.max(FOREST_DIORAMA_BOARD_WIDTH, width * 1.1)) /
        FOREST_DIORAMA_BOARD_WIDTH) *
        FOREST_DIORAMA_BOARD_HEIGHT,
    ),
  );
  const [adminControlsOpen, setAdminControlsOpen] = useState(false);
  const [adminGrowthBusy, setAdminGrowthBusy] = useState(false);
  const [adminGrowthError, setAdminGrowthError] = useState<string | null>(null);
  const [selectedRoamingCompanionIds, setSelectedRoamingCompanionIds] = useState<string[]>([]);
  const shouldReduceMotion = Platform.OS !== 'web' && reduceMotionEnabled;
  const forestBreeze = useRef(new Animated.Value(0)).current;
  const starTwinkleOne = useRef(new Animated.Value(0)).current;
  const starTwinkleTwo = useRef(new Animated.Value(0)).current;
  const starTwinkleThree = useRef(new Animated.Value(0)).current;
  const treeCanopyLeftBreeze = useRef(new Animated.Value(0)).current;
  const treeCanopyCenterBreeze = useRef(new Animated.Value(0)).current;
  const treeCanopyRightBreeze = useRef(new Animated.Value(0)).current;
  const forestDioramaDrift = useRef(new Animated.Value(0)).current;
  const forestDioramaThemeTransition = useRef(new Animated.Value(1)).current;
  const forestDioramaPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const forestDioramaZoom = useRef(new Animated.Value(FOREST_DIORAMA_MIN_ZOOM)).current;
  const forestDioramaZoomValue = useRef(FOREST_DIORAMA_MIN_ZOOM);
  const forestDioramaZoomStart = useRef(FOREST_DIORAMA_MIN_ZOOM);
  const forestDioramaPanValue = useRef({ x: 0, y: 0 });
  const forestDioramaPanStart = useRef({ x: 0, y: 0 });
  const forestDioramaPinchDistanceStart = useRef<number | null>(null);
  const forestDioramaPinchCenterStart = useRef<{ x: number; y: number } | null>(null);
  const forestDioramaGestureMode = useRef<'pan' | 'pinch' | null>(null);
  const completionSlide = useRef(new Animated.Value(0)).current;
  const previousTreeRef = useRef<ActiveTree | null>(null);
  const animalSelectionTouchedRef = useRef(false);
  const growPreferencesRestoredRef = useRef(false);
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const sheetProgressValue = useRef(0);
  const dragStartProgress = useRef(0);
  const mapScrollRef = useRef<ScrollView | null>(null);
  const mapScrollOffset = useRef(0);
  const mapDragStartOffset = useRef(0);
  const speciesId = tree?.speciesId ?? TREE_SPECIES[0]?.id ?? 'apple';
  const stage = tree ? getGrowthStage(tree.growthPoints) : 'seed';
  const growthDay = tree ? Math.min(COMPLETE_GROWTH_POINTS, tree.growthPoints) : 0;
  const treeSpeciesLabel = getSpeciesLabel(speciesId);
  const stageLabel = getStageLabel(stage, treeSpeciesLabel);
  const stageProgressPercent = getStageProgressPercent(growthDay, stage);
  const growthVerse = getStableTreeVerse(getStableTreeVerseKey(tree, speciesId));
  const displayedCollectionKind = activeCollection ?? lastCollectionKind;
  const activeCollectionTitle = displayedCollectionKind === 'tree' ? 'Tree Book' : 'Animal Book';
  const selectedDioramaTheme = FOREST_FLAT_MAP;
  const sharedPrayerCount = countGrowthEvents(tree, 'prayer_posted');
  const carriedPrayerCount = countGrowthEvents(tree, 'reaction_given');
  const plantedAtLabel = formatTreeStartedDate(tree?.startedAt);
  const fruitBearingTreeCount = countFruitBearingTrees({
    activeTree: tree,
    completedTreeCount,
  });
  const selectedDioramaTreeWindow = useMemo(
    () =>
      getForestDioramaThemeTreeWindow({
        completedTreeCount: fruitBearingTreeCount,
        isAdmin: isAdminUser,
        themeIndex: 0,
      }),
    [fruitBearingTreeCount, isAdminUser],
  );
  const wheelCardWidth = Math.round(Math.min(286, Math.max(236, width * 0.72)));
  const wheelCardGap = 14;
  const wheelSnapInterval = wheelCardWidth + wheelCardGap;
  const wheelSidePadding = Math.max(18, Math.round((width - wheelCardWidth) / 2));
  const collectionDexGridWidth =
    width - COLLECTION_DEX_GRID_HORIZONTAL_PADDING * 2 - COLLECTION_DEX_GRID_GAP * 2;
  const collectionDexCardWidth = Math.floor(collectionDexGridWidth / 3);
  const treeDetailStageCellWidth = Math.max(
    50,
    Math.min(62, Math.floor((Math.min(width, 430) - 72) / 5)),
  );
  const hasFruitingTree = stage === 'fruiting_tree' || stage === 'completed';
  const unlockedAnimalCompanions = useMemo(
    () =>
      getUnlockedAnimalCompanions({
        activeTree: tree,
        completedTreeCount,
        isAdmin: isAdminUser,
      }),
    [completedTreeCount, isAdminUser, tree],
  );
  const unlockedAnimalCompanionIds = useMemo(
    () => unlockedAnimalCompanions.map((companion) => companion.id),
    [unlockedAnimalCompanions],
  );
  const unlockedAnimalIds = useMemo(
    () => new Set(unlockedAnimalCompanionIds),
    [unlockedAnimalCompanionIds],
  );
  const selectedAnimalIdSet = useMemo(
    () => new Set(selectedRoamingCompanionIds),
    [selectedRoamingCompanionIds],
  );
  const roamingAnimalEntries = useMemo(
    () => {
      if (!growPreferencesReady) {
        return [];
      }

      return selectRoamingAnimalCompanions({
        fillUnselected: selectedRoamingCompanionIds.length === 0,
        selectedCompanionIds: selectedRoamingCompanionIds,
        unlockedCompanions: unlockedAnimalCompanions,
      }).flatMap((companion) => {
        const imageAssets = ANIMAL_COMPANION_IMAGE_ASSETS[companion.id];
        const previewImage = ANIMAL_COMPANION_PREVIEW_IMAGES[companion.id] ?? null;

        return imageAssets ? [{ companion, imageAssets, previewImage }] : [];
      });
    },
    [growPreferencesReady, selectedRoamingCompanionIds, unlockedAnimalCompanions],
  );
  const forestRoamingAnimalEntries = useMemo(
    () =>
      unlockedAnimalCompanions.flatMap((companion) => {
        const imageAssets = ANIMAL_COMPANION_IMAGE_ASSETS[companion.id];
        const previewImage = ANIMAL_COMPANION_PREVIEW_IMAGES[companion.id] ?? null;

        return imageAssets ? [{ companion, imageAssets, previewImage }] : [];
      }),
    [unlockedAnimalCompanions],
  );
  const speciesStageImages = useMemo(
    () => {
      return TREE_STAGE_IMAGES_BY_SPECIES[speciesId] ?? TREE_STAGE_IMAGES_BY_SPECIES.apple;
    },
    [speciesId],
  );
  const speciesStagePreviewImages = useMemo(
    () =>
      TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES[speciesId] ??
      TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple,
    [speciesId],
  );
  const stageAsset = useMemo(
    () => speciesStageImages[treeStageIndex(stage)],
    [speciesStageImages, stage],
  );
  const stagePreviewAsset = useMemo(
    () => speciesStagePreviewImages[treeStageIndex(stage)],
    [speciesStagePreviewImages, stage],
  );
  const resolvedSceneBackground = useMemo(
    () => getBundledGrowImageSource(sceneLayers.backgroundImage),
    [sceneLayers.backgroundImage],
  );
  const resolvedScenePreviewImage = useMemo(
    () =>
      getBundledGrowImageSource(
        GROW_MAP_PREVIEW_IMAGES[sceneLayers.id] ??
          sceneLayers.guideImage ??
          sceneLayers.backgroundImage,
      ),
    [sceneLayers.backgroundImage, sceneLayers.guideImage, sceneLayers.id],
  );
  const resolvedNextFieldImage = useMemo(
    () => getBundledGrowImageSource(GROW_MAP_SCENE_ASSETS.wilderness.backgroundImage),
    [],
  );
  const resolvedNextFieldPreviewImage = useMemo(
    () => getBundledGrowImageSource(GROW_MAP_PREVIEW_IMAGES.wilderness),
    [],
  );
  const resolvedStageAsset = useMemo(
    () => getBundledGrowImageSource(stageAsset),
    [stageAsset],
  );
  const resolvedStagePreviewAsset = useMemo(
    () => getBundledGrowImageSource(stagePreviewAsset),
    [stagePreviewAsset],
  );
  const resolvedSceneStillLayer = useMemo(
    () =>
      sceneLayers.stillLayerImage
        ? getBundledGrowImageSource(sceneLayers.stillLayerImage)
        : null,
    [sceneLayers.stillLayerImage],
  );
  const resolvedSceneBreezeLayer = useMemo(
    () =>
      sceneLayers.breezeLayerImage
        ? getBundledGrowImageSource(sceneLayers.breezeLayerImage)
        : null,
    [sceneLayers.breezeLayerImage],
  );
  const treeWheelEntries = useMemo(
    () =>
      TREE_SPECIES.map((species, index) => {
        const finalTreeImage =
          TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES[species.id]?.[4] ??
          TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple[4];

        return {
          id: species.id,
          label: species.label,
          meta: `#${String(index + 1).padStart(3, '0')}`,
          image: getBundledGrowImageSource(finalTreeImage),
          unlocked: isTreeSpeciesUnlocked({
            activeSpeciesId: speciesId,
            hasFruitingTree,
            isAdmin: isAdminUser,
            speciesId: species.id,
          }),
        };
      }),
    [hasFruitingTree, isAdminUser, speciesId],
  );
  const animalWheelEntries = useMemo(
    () =>
      ANIMAL_COMPANIONS.map((companion, index) => {
        const imageAssets = ANIMAL_COMPANION_IMAGE_ASSETS[companion.id];
        const unlocked = unlockedAnimalIds.has(companion.id);
        const previewImage = ANIMAL_COMPANION_PREVIEW_IMAGES[companion.id];

        return {
          id: companion.id,
          label: companion.label,
          meta: `#${String(index + 1).padStart(3, '0')}`,
          image: previewImage
            ? getBundledGrowImageSource(previewImage)
            : imageAssets
              ? getBundledGrowImageSource(imageAssets.idleImage)
              : null,
          unlocksAtFruitBearingTreeCount: companion.unlocksAtFruitBearingTreeCount,
          unlocked,
        };
      }),
    [unlockedAnimalIds],
  );
  const forestDioramaEntries = useMemo(
    () =>
      Array.from(
        {
          length: Math.min(FOREST_DIORAMA_SLOTS.length, selectedDioramaTreeWindow.treeCount),
        },
        (_, slotIndex) => {
          const treeIndex = selectedDioramaTreeWindow.startIndex + slotIndex;
          const species = TREE_SPECIES[treeIndex % TREE_SPECIES.length] ?? TREE_SPECIES[0];
          const finalTreeImage =
            TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES[species.id]?.[4] ??
            TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple[4];

          return {
            id: `${selectedDioramaTheme.id}-${treeIndex}-${species.id}`,
            title: species.label,
            image: getBundledGrowImageSource(finalTreeImage),
          };
        },
      ),
    [
      selectedDioramaTheme.id,
      selectedDioramaTreeWindow.startIndex,
      selectedDioramaTreeWindow.treeCount,
    ],
  );
  const mapWheelEntries = useMemo(
    () =>
      GROW_MAP_AREAS.map((area, index) => ({
        ...area,
        meta: `#${String(index + 1).padStart(3, '0')}`,
        image: getBundledGrowImageSource(area.image),
        unlocked: isGrowMapAreaUnlocked({
          area,
          fruitBearingTreeCount,
          isAdmin: isAdminUser,
        }),
      })),
    [fruitBearingTreeCount, isAdminUser],
  );
  const mapPreviewWarmupSources = useMemo(
    () => mapWheelEntries.map((entry) => entry.image).filter(isGrowImageSource),
    [mapWheelEntries],
  );
  const mapWheelMaxOffset = Math.max(0, (mapWheelEntries.length - 1) * wheelSnapInterval);
  const snapMapWheelToIndex = useCallback(
    (index: number, animated = true) => {
      const nextIndex = clamp(index, 0, mapWheelEntries.length - 1);
      const nextOffset = nextIndex * wheelSnapInterval;

      mapScrollOffset.current = nextOffset;
      setSelectedMapIndex(nextIndex);
      mapScrollRef.current?.scrollTo({ x: nextOffset, y: 0, animated });
    },
    [mapWheelEntries.length, wheelSnapInterval],
  );
  const mapWheelPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Platform.OS === 'web' &&
          Math.abs(gestureState.dx) > 4 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          mapDragStartOffset.current = mapScrollOffset.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = clamp(mapDragStartOffset.current - gestureState.dx, 0, mapWheelMaxOffset);

          mapScrollOffset.current = nextOffset;
          mapScrollRef.current?.scrollTo({ x: nextOffset, y: 0, animated: false });
        },
        onPanResponderRelease: (_, gestureState) => {
          const targetOffset = clamp(mapDragStartOffset.current - gestureState.dx, 0, mapWheelMaxOffset);

          snapMapWheelToIndex(Math.round(targetOffset / wheelSnapInterval));
        },
        onPanResponderTerminate: () => {
          snapMapWheelToIndex(Math.round(mapScrollOffset.current / wheelSnapInterval));
        },
      }),
    [mapWheelMaxOffset, snapMapWheelToIndex, wheelSnapInterval],
  );
  const forestDioramaPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => getForestDioramaTouches(event).length >= 2,
        onMoveShouldSetPanResponder: (event, gestureState) =>
          getForestDioramaTouches(event).length >= 2 ||
          Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8,
        onPanResponderGrant: (event) => {
          forestDioramaPan.stopAnimation((value) => {
            const currentOffset = clampForestDioramaPanOffset({
              offset: value,
              zoom: forestDioramaZoomValue.current,
            });

            forestDioramaPanStart.current = currentOffset;
            forestDioramaPanValue.current = currentOffset;
          });
          forestDioramaZoom.stopAnimation((value) => {
            const currentZoom = clampForestDioramaZoom(value);

            forestDioramaZoomStart.current = currentZoom;
            forestDioramaZoomValue.current = currentZoom;
            forestDioramaZoom.setValue(currentZoom);
          });

          const pinchDistance = getForestDioramaPinchDistance(event);

          forestDioramaGestureMode.current = pinchDistance ? 'pinch' : 'pan';
          forestDioramaPinchDistanceStart.current = pinchDistance;
          forestDioramaPinchCenterStart.current = getForestDioramaPinchCenter(event);
        },
        onPanResponderMove: (event, gestureState) => {
          const pinchDistance = getForestDioramaPinchDistance(event);

          if (pinchDistance) {
            if (!forestDioramaPinchDistanceStart.current) {
              forestDioramaPinchDistanceStart.current = pinchDistance;
              forestDioramaPinchCenterStart.current = getForestDioramaPinchCenter(event);
              forestDioramaZoomStart.current = forestDioramaZoomValue.current;
              forestDioramaPanStart.current = forestDioramaPanValue.current;
            }

            forestDioramaGestureMode.current = 'pinch';

            const nextZoom = clampForestDioramaZoom(
              forestDioramaZoomStart.current *
                (pinchDistance / forestDioramaPinchDistanceStart.current),
            );
            const pinchCenter = getForestDioramaPinchCenter(event);
            const pinchCenterStart = forestDioramaPinchCenterStart.current ?? pinchCenter;
            const centerDelta = pinchCenter && pinchCenterStart
              ? {
                  x: pinchCenter.x - pinchCenterStart.x,
                  y: pinchCenter.y - pinchCenterStart.y,
                }
              : { x: 0, y: 0 };
            const nextOffset = clampForestDioramaPanOffset({
              offset: {
                x: forestDioramaPanStart.current.x + centerDelta.x,
                y: forestDioramaPanStart.current.y + centerDelta.y,
              },
              zoom: nextZoom,
            });

            forestDioramaZoomValue.current = nextZoom;
            forestDioramaPanValue.current = nextOffset;
            forestDioramaZoom.setValue(nextZoom);
            forestDioramaPan.setValue(nextOffset);

            return;
          }

          if (forestDioramaGestureMode.current === 'pinch') {
            return;
          }

          const nextOffset = clampForestDioramaPanOffset({
            offset: {
              x: forestDioramaPanStart.current.x + gestureState.dx,
              y: forestDioramaPanStart.current.y + gestureState.dy,
            },
            zoom: forestDioramaZoomValue.current,
          });

          forestDioramaPanValue.current = nextOffset;
          forestDioramaPan.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const isPinching = forestDioramaGestureMode.current === 'pinch';
          const nextZoom = clampForestDioramaZoom(forestDioramaZoomValue.current);
          const nextOffset = clampForestDioramaPanOffset({
            offset: isPinching
              ? forestDioramaPanValue.current
              : {
                  x: forestDioramaPanStart.current.x + gestureState.dx + gestureState.vx * 18,
                  y: forestDioramaPanStart.current.y + gestureState.dy + gestureState.vy * 18,
                },
            zoom: nextZoom,
          });

          forestDioramaGestureMode.current = null;
          forestDioramaPinchDistanceStart.current = null;
          forestDioramaPinchCenterStart.current = null;
          forestDioramaZoomStart.current = nextZoom;
          forestDioramaZoomValue.current = nextZoom;
          forestDioramaPanStart.current = nextOffset;
          forestDioramaPanValue.current = nextOffset;
          Animated.spring(forestDioramaPan, {
            toValue: nextOffset,
            damping: 19,
            stiffness: 160,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
          Animated.spring(forestDioramaZoom, {
            toValue: nextZoom,
            damping: 20,
            stiffness: 170,
            mass: 0.7,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          const nextZoom = clampForestDioramaZoom(forestDioramaZoomValue.current);
          const nextOffset = clampForestDioramaPanOffset({
            offset: forestDioramaPanValue.current,
            zoom: nextZoom,
          });

          forestDioramaGestureMode.current = null;
          forestDioramaPinchDistanceStart.current = null;
          forestDioramaPinchCenterStart.current = null;
          forestDioramaZoomStart.current = nextZoom;
          forestDioramaZoomValue.current = nextZoom;
          forestDioramaPanStart.current = nextOffset;
          forestDioramaPanValue.current = nextOffset;
          Animated.spring(forestDioramaPan, {
            toValue: nextOffset,
            damping: 19,
            stiffness: 160,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
          Animated.spring(forestDioramaZoom, {
            toValue: nextZoom,
            damping: 20,
            stiffness: 170,
            mass: 0.7,
            useNativeDriver: true,
          }).start();
        },
      }),
    [forestDioramaPan, forestDioramaZoom],
  );
  const selectMapScene = useCallback(
    (index: number) => {
      const targetArea = mapWheelEntries[index];

      if (!targetArea?.unlocked) {
        snapMapWheelToIndex(index);
        return;
      }

      setSceneLayers(targetArea.scene);
      setShowNextScene(false);
      completionSlide.setValue(0);
      snapMapWheelToIndex(index);
    },
    [completionSlide, mapWheelEntries, snapMapWheelToIndex],
  );
  const hasSceneStillLayer = Boolean(resolvedSceneStillLayer);
  const hasSceneBreezeLayer = Boolean(resolvedSceneBreezeLayer);
  const isNightSkyScene = sceneLayers.id === 'nightSky';
  const matureTreeArtSize = Math.min(372, Math.max(260, width * 0.92));
  const treeArtSize = Math.round(matureTreeArtSize * TREE_STAGE_SIZE_FACTORS[stage]);
  const treeLeafLayerHeight = Math.round(treeArtSize * TREE_LEAF_LAYER_RATIOS[stage]);
  const treeLayerOverlap = Math.max(6, Math.round(treeArtSize * 0.035));
  const treeBaseLayerTop = Math.max(0, treeLeafLayerHeight - treeLayerOverlap);
  const treeBottomOffset = Math.min(438, Math.max(388, height * 0.51));
  const roamingAnimalSize = Math.round(clamp(width * 0.2, 72, 104));
  const forestRoamingAnimalSize = Math.round(clamp(width * 0.085, 30, 38));
  const forestRoamingAnimalMaxVisualWidth = Math.round(forestRoamingAnimalSize * 1.24);
  const roamingAnimalBottom = Math.max(
    236,
    treeBottomOffset - Math.round(roamingAnimalSize * 0.56),
  );
  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_CLOSED_TRANSLATE, 0],
    extrapolate: 'clamp',
  });
  const currentSceneTranslateY = completionSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height],
    extrapolate: 'clamp',
  });
  const nextSceneTranslateY = completionSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
    extrapolate: 'clamp',
  });
  const pullTabOpacity = sheetProgress.interpolate({
    inputRange: [0, 0.18, 0.42],
    outputRange: [1, 0.78, 0],
    extrapolate: 'clamp',
  });
  const pullTabScale = sheetProgress.interpolate({
    inputRange: [0, 0.42],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  const treeLeftBreezeRotate = treeCanopyLeftBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: ['-0.08deg', '0.05deg', '-0.02deg', '0.07deg', '-0.08deg'],
  });
  const treeLeftBreezeTranslateX = treeCanopyLeftBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [-0.18, 0.22, 0.04, -0.14, -0.18],
  });
  const treeLeftBreezeTranslateY = treeCanopyLeftBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0, -0.06, 0, 0.03, 0],
  });
  const treeLeftBreezeScaleX = treeCanopyLeftBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0.9995, 1.0005, 1, 0.9998, 0.9995],
  });
  const treeCenterBreezeRotate = treeCanopyCenterBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: ['0.02deg', '-0.06deg', '0deg', '0.05deg', '0.02deg'],
  });
  const treeCenterBreezeTranslateX = treeCanopyCenterBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0.11, -0.18, -0.02, 0.14, 0.11],
  });
  const treeCenterBreezeTranslateY = treeCanopyCenterBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0, -0.04, 0, 0.02, 0],
  });
  const treeCenterBreezeScaleX = treeCanopyCenterBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [1, 0.9995, 1, 1.0002, 1],
  });
  const treeRightBreezeRotate = treeCanopyRightBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: ['0.07deg', '-0.05deg', '0.01deg', '0.06deg', '0.07deg'],
  });
  const treeRightBreezeTranslateX = treeCanopyRightBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0.16, -0.12, -0.04, 0.09, 0.16],
  });
  const treeRightBreezeTranslateY = treeCanopyRightBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0, -0.05, 0, 0.025, 0],
  });
  const treeRightBreezeScaleX = treeCanopyRightBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [1.0002, 1.0008, 1, 0.9996, 1.0002],
  });
  const forestLeavesTranslateX = forestBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [-0.16, 0.24, 0.03, -0.12, -0.16],
  });
  const forestLeavesTranslateY = forestBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0, -0.12, 0, 0.08, 0],
  });
  const forestLeavesScaleX = forestBreeze.interpolate({
    inputRange: BREEZE_INPUT_RANGE,
    outputRange: [0.9996, 1.0011, 1, 0.9995, 0.9996],
  });
  const nightSkyTwinkleStyles = [
    {
      opacity: starTwinkleOne.interpolate({
        inputRange: TWINKLE_INPUT_RANGE,
        outputRange: [0.35, 1, 0.48, 0.86, 0.42, 0.35],
      }),
      transform: [
        {
          scale: starTwinkleOne.interpolate({
            inputRange: TWINKLE_INPUT_RANGE,
            outputRange: [0.76, 1.45, 0.9, 1.22, 0.82, 0.76],
          }),
        },
      ],
    },
    {
      opacity: starTwinkleTwo.interpolate({
        inputRange: TWINKLE_INPUT_RANGE,
        outputRange: [0.52, 0.74, 0.32, 1, 0.58, 0.52],
      }),
      transform: [
        {
          scale: starTwinkleTwo.interpolate({
            inputRange: TWINKLE_INPUT_RANGE,
            outputRange: [0.92, 1.14, 0.7, 1.5, 1, 0.92],
          }),
        },
      ],
    },
    {
      opacity: starTwinkleThree.interpolate({
        inputRange: TWINKLE_INPUT_RANGE,
        outputRange: [0.42, 0.66, 1, 0.5, 0.9, 0.42],
      }),
      transform: [
        {
          scale: starTwinkleThree.interpolate({
            inputRange: TWINKLE_INPUT_RANGE,
            outputRange: [0.84, 1.06, 1.58, 0.88, 1.28, 0.84],
          }),
        },
      ],
    },
  ];

  function openCollection(kind: CollectionKind) {
    setCollectionHasOpened(true);
    setLastCollectionKind(kind);
    setSelectedCollectionSlot(null);
    setSelectedTreeStageIndex(4);
    setActiveCollection(kind);
  }

  function openCollectionBook() {
    openCollection('tree');
  }

  function openTreeDetail(index: number) {
    setSelectedTreeStageIndex(4);
    setSelectedCollectionSlot(index);
  }

  function closeCollection() {
    setActiveCollection(null);
    setSelectedCollectionSlot(null);
    setSelectedTreeStageIndex(4);
  }

  function openForestDiorama() {
    forestDioramaGestureMode.current = null;
    forestDioramaPinchDistanceStart.current = null;
    forestDioramaPinchCenterStart.current = null;
    forestDioramaZoomStart.current = FOREST_DIORAMA_MIN_ZOOM;
    forestDioramaZoomValue.current = FOREST_DIORAMA_MIN_ZOOM;
    forestDioramaPanStart.current = { x: 0, y: 0 };
    forestDioramaPanValue.current = { x: 0, y: 0 };
    forestDioramaZoom.setValue(FOREST_DIORAMA_MIN_ZOOM);
    forestDioramaPan.setValue({ x: 0, y: 0 });
    setForestHasOpened(true);
    setForestVisible(true);
  }

  function openMapPicker() {
    setMapHasOpened(true);
    setMapVisible(true);
  }

  const toggleRoamingAnimalSelection = useCallback(
    (companionId: string) => {
      animalSelectionTouchedRef.current = true;
      setSelectedRoamingCompanionIds((currentCompanionIds) =>
        toggleSelectedAnimalCompanionId({
          companionId,
          selectedCompanionIds: currentCompanionIds,
          unlockedCompanionIds: unlockedAnimalCompanionIds,
        }),
      );
    },
    [unlockedAnimalCompanionIds],
  );

  const adjustTreeGrowthAsAdmin = useCallback(
    async (direction: -1 | 1) => {
      if (!tree || adminGrowthBusy) {
        return;
      }

      const nextGrowthPoints =
        direction > 0 && tree.growthPoints >= COMPLETE_GROWTH_POINTS
          ? COMPLETE_GROWTH_POINTS
          : Math.min(
              COMPLETE_GROWTH_POINTS,
              Math.max(0, tree.growthPoints + direction),
            );

      if (
        nextGrowthPoints === tree.growthPoints &&
        !(direction > 0 && tree.growthPoints >= COMPLETE_GROWTH_POINTS)
      ) {
        return;
      }

      setAdminGrowthBusy(true);
      setAdminGrowthError(null);

      try {
        await updateTreeGrowthAsAdmin(nextGrowthPoints);
      } catch (error) {
        console.warn('Could not update tree growth as admin.', error);
        setAdminGrowthError('Could not update this tree. Try again.');
      } finally {
        setAdminGrowthBusy(false);
      }
    },
    [adminGrowthBusy, tree],
  );

  useEffect(() => {
    if (
      !treeSnapshotReady ||
      !completedTreeCountReady ||
      !adminStatusReady ||
      growPreferencesRestoredRef.current
    ) {
      return undefined;
    }

    let mounted = true;
    growPreferencesRestoredRef.current = true;

    loadGrowPreferences()
      .then((preferences) => {
        if (!mounted) {
          return;
        }

        if (preferences?.selectedMapSceneId) {
          const restoredMapIndex = mapWheelEntries.findIndex(
            (area) => area.unlocked && area.scene.id === preferences.selectedMapSceneId,
          );

          if (restoredMapIndex >= 0) {
            const restoredMapArea = mapWheelEntries[restoredMapIndex];

            setSceneLayers(restoredMapArea.scene);
            setShowNextScene(false);
            completionSlide.setValue(0);
            snapMapWheelToIndex(restoredMapIndex, false);
          }
        }

        if (preferences) {
          animalSelectionTouchedRef.current = preferences.animalSelectionTouched;

          const restoredAnimalIds = getNextSelectedAnimalCompanionIds({
            manuallySelected: preferences.animalSelectionTouched,
            selectedCompanionIds: preferences.selectedRoamingCompanionIds,
            unlockedCompanionIds: unlockedAnimalCompanionIds,
          });
          const fallbackAnimalIds =
            restoredAnimalIds.length === 0 && preferences.selectedRoamingCompanionIds.length > 0
              ? normalizeSelectedAnimalCompanionIds({
                  fillFromUnlocked: true,
                  selectedCompanionIds: [],
                  unlockedCompanionIds: unlockedAnimalCompanionIds,
                })
              : restoredAnimalIds;

          if (fallbackAnimalIds.length > 0) {
            setSelectedRoamingCompanionIds(fallbackAnimalIds);
          }
        }

        setGrowPreferencesReady(true);
      })
      .catch((error) => {
        console.warn('Could not load grow preferences.', error);

        if (mounted) {
          setGrowPreferencesReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    adminStatusReady,
    completedTreeCountReady,
    completionSlide,
    mapWheelEntries,
    snapMapWheelToIndex,
    treeSnapshotReady,
    unlockedAnimalCompanionIds,
  ]);

  useEffect(() => {
    if (!growPreferencesReady) {
      return;
    }

    void persistGrowPreferences({
      animalSelectionTouched: animalSelectionTouchedRef.current,
      selectedDioramaThemeId: selectedDioramaTheme.id,
      selectedMapSceneId: sceneLayers.id,
      selectedRoamingCompanionIds,
    }).catch((error) => {
      console.warn('Could not save grow preferences.', error);
    });
  }, [growPreferencesReady, sceneLayers.id, selectedDioramaTheme.id, selectedRoamingCompanionIds]);

  useEffect(() => {
    const nextBoardWidth = Math.min(470, Math.max(FOREST_DIORAMA_BOARD_WIDTH, width * 1.1));

    setForestDioramaBoardWidth(nextBoardWidth);
    setForestDioramaBoardHeight(
      Math.round((nextBoardWidth / FOREST_DIORAMA_BOARD_WIDTH) * FOREST_DIORAMA_BOARD_HEIGHT),
    );
  }, [width]);

  useEffect(() => {
    setSelectedRoamingCompanionIds((currentCompanionIds) => {
      const nextCompanionIds = getNextSelectedAnimalCompanionIds({
        manuallySelected: animalSelectionTouchedRef.current,
        selectedCompanionIds: currentCompanionIds,
        unlockedCompanionIds: unlockedAnimalCompanionIds,
      });

      return areStringArraysEqual(currentCompanionIds, nextCompanionIds)
        ? currentCompanionIds
        : nextCompanionIds;
    });
  }, [unlockedAnimalCompanionIds]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    subscribeToCurrentUserAdminStatus((nextAdminStatus) => {
      if (mounted) {
        setIsAdminUser(nextAdminStatus);
        setAdminStatusReady(true);
      }
    }).then((nextUnsubscribe) => {
      if (mounted) {
        unsubscribe = nextUnsubscribe;
      } else {
        nextUnsubscribe();
      }
    }).catch((error) => {
      console.warn('Could not subscribe to admin status.', error);

      if (mounted) {
        setIsAdminUser(false);
        setAdminStatusReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const animateSheet = useCallback((open: boolean) => {
    setSheetOpen(open);

    if (shouldReduceMotion) {
      sheetProgress.setValue(open ? 1 : 0);
      return;
    }

    Animated.spring(sheetProgress, {
      toValue: open ? 1 : 0,
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      tension: 90,
      friction: 12,
    }).start();
  }, [sheetProgress, shouldReduceMotion]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          dragStartProgress.current = sheetProgressValue.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextProgress = clamp(
            dragStartProgress.current - gestureState.dy / SHEET_OPEN_DISTANCE,
            0,
            1,
          );
          sheetProgress.setValue(nextProgress);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
            animateSheet(!sheetOpen);
            return;
          }

          if (gestureState.vy < -0.45 || gestureState.dy < -72) {
            animateSheet(true);
            return;
          }

          if (gestureState.vy > 0.45 || gestureState.dy > 72) {
            animateSheet(false);
            return;
          }

          animateSheet(sheetProgressValue.current > 0.45);
        },
        onPanResponderTerminate: () => {
          animateSheet(sheetProgressValue.current > 0.5);
        },
      }),
    [animateSheet, sheetOpen, sheetProgress],
  );

  useEffect(() => {
    const listener = sheetProgress.addListener(({ value }) => {
      sheetProgressValue.current = value;
    });

    return () => {
      sheetProgress.removeListener(listener);
    };
  }, [sheetProgress]);

  useEffect(() => {
    if (growPreviewTree) {
      setTree(growPreviewTree);
      setTreeSnapshotReady(true);

      return undefined;
    }

    return subscribeToActiveTree((nextTree, source) => {
      setTree(nextTree);

      if (nextTree || source === 'server') {
        setTreeSnapshotReady(true);
      }
    });
  }, [growPreviewTree]);

  useEffect(() => {
    let mounted = true;

    if (growPreviewTree) {
      setCompletedTreeCount(growPreviewCompletedTreeCount);
      setCompletedTreeCountReady(true);
      return () => {
        mounted = false;
      };
    }

    setCompletedTreeCountReady(false);

    fetchPersistedCompletedTreeCount().then((nextCompletedTreeCount) => {
      if (mounted) {
        setCompletedTreeCount(nextCompletedTreeCount);
        setCompletedTreeCountReady(true);
      }
    }).catch((error) => {
      console.warn('Could not load completed tree count.', error);

      if (mounted) {
        setCompletedTreeCountReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [growPreviewCompletedTreeCount, growPreviewTree, tree?.id]);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotionEnabled(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const previousTree = previousTreeRef.current;

    if (
      previousTree &&
      tree &&
      previousTree.id !== tree.id &&
      previousTree.growthPoints >= COMPLETE_GROWTH_POINTS &&
      tree.growthPoints === 0
    ) {
      if (shouldReduceMotion) {
        setSceneLayers(GROW_MAP_SCENE_ASSETS.wilderness);
        setShowNextScene(false);
        completionSlide.setValue(0);
        previousTreeRef.current = tree;
        return;
      }

      setShowNextScene(true);
      completionSlide.setValue(0);
      Animated.timing(completionSlide, {
        toValue: 1,
        duration: 720,
        useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
      }).start(() => {
        setSceneLayers(GROW_MAP_SCENE_ASSETS.wilderness);
        setShowNextScene(false);
        completionSlide.setValue(0);
      });
    }

    previousTreeRef.current = tree;
  }, [completionSlide, shouldReduceMotion, tree]);

  useEffect(() => {
    if (shouldReduceMotion) {
      forestBreeze.setValue(0.5);
      starTwinkleOne.setValue(0.58);
      starTwinkleTwo.setValue(0.36);
      starTwinkleThree.setValue(0.78);
      treeCanopyLeftBreeze.setValue(0.5);
      treeCanopyCenterBreeze.setValue(0.5);
      treeCanopyRightBreeze.setValue(0.5);
      return;
    }

    forestBreeze.setValue(0);
    starTwinkleOne.setValue(0);
    starTwinkleTwo.setValue(0.36);
    starTwinkleThree.setValue(0.72);
    treeCanopyLeftBreeze.setValue(0);
    treeCanopyCenterBreeze.setValue(0);
    treeCanopyRightBreeze.setValue(0);
    const forestBreezeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(forestBreeze, {
          toValue: 0.28,
          duration: 7600,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(forestBreeze, {
          toValue: 0.74,
          duration: 8600,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(forestBreeze, {
          toValue: 1,
          duration: 7800,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(forestBreeze, {
          toValue: 0,
          duration: 8400,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.delay(800),
      ]),
    );
    const treeCanopyLeftLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(treeCanopyLeftBreeze, {
          toValue: 0.28,
          duration: 7600,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyLeftBreeze, {
          toValue: 0.74,
          duration: 8800,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyLeftBreeze, {
          toValue: 1,
          duration: 6600,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyLeftBreeze, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.delay(600),
      ]),
    );
    const treeCanopyCenterLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(treeCanopyCenterBreeze, {
          toValue: 0.28,
          duration: 9300,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyCenterBreeze, {
          toValue: 0.74,
          duration: 7800,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyCenterBreeze, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyCenterBreeze, {
          toValue: 0,
          duration: 8400,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.delay(900),
      ]),
    );
    const treeCanopyRightLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(treeCanopyRightBreeze, {
          toValue: 0.28,
          duration: 10100,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyRightBreeze, {
          toValue: 0.74,
          duration: 7000,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyRightBreeze, {
          toValue: 1,
          duration: 10800,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(treeCanopyRightBreeze, {
          toValue: 0,
          duration: 9200,
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    );
    const starTwinkleOneLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkleOne, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(starTwinkleOne, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    );
    const starTwinkleTwoLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(starTwinkleTwo, {
          toValue: 1,
          duration: 3100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(starTwinkleTwo, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    );
    const starTwinkleThreeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(960),
        Animated.timing(starTwinkleThree, {
          toValue: 1,
          duration: 2700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(starTwinkleThree, {
          toValue: 0,
          duration: 3300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    );

    forestBreezeLoop.start();
    starTwinkleOneLoop.start();
    starTwinkleTwoLoop.start();
    starTwinkleThreeLoop.start();
    treeCanopyLeftLoop.start();
    treeCanopyCenterLoop.start();
    treeCanopyRightLoop.start();

    return () => {
      forestBreezeLoop.stop();
      starTwinkleOneLoop.stop();
      starTwinkleTwoLoop.stop();
      starTwinkleThreeLoop.stop();
      treeCanopyLeftLoop.stop();
      treeCanopyCenterLoop.stop();
      treeCanopyRightLoop.stop();
    };
  }, [
    forestBreeze,
    shouldReduceMotion,
    starTwinkleOne,
    starTwinkleThree,
    starTwinkleTwo,
    treeCanopyCenterBreeze,
    treeCanopyLeftBreeze,
    treeCanopyRightBreeze,
  ]);

  useEffect(() => {
    if (!forestVisible || shouldReduceMotion) {
      forestDioramaDrift.setValue(0);
      return undefined;
    }

    const treeMotion = getForestDioramaTreeMotion({ slotIndex: 0 });
    const halfTreeMotionDurationMs = Math.round(treeMotion.durationMs / 2);

    forestDioramaDrift.setValue(0);
    const backgroundLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(forestDioramaDrift, {
          toValue: 0.5,
          duration: halfTreeMotionDurationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
        Animated.timing(forestDioramaDrift, {
          toValue: 1,
          duration: halfTreeMotionDurationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
        }),
      ]),
    );
    backgroundLoop.start();

    return () => {
      backgroundLoop.stop();
    };
  }, [
    forestDioramaDrift,
    forestVisible,
    shouldReduceMotion,
  ]);

  useEffect(() => {
    if (!forestVisible) {
      forestDioramaThemeTransition.setValue(1);
      return;
    }

    if (shouldReduceMotion) {
      forestDioramaThemeTransition.setValue(1);
      return;
    }

    forestDioramaThemeTransition.setValue(0);
    Animated.timing(forestDioramaThemeTransition, {
      toValue: 1,
      duration: 640,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_ANIMATION_DRIVER,
    }).start();
  }, [forestDioramaThemeTransition, forestVisible, shouldReduceMotion]);

  const collectionWheelEntries = displayedCollectionKind === 'tree' ? treeWheelEntries : animalWheelEntries;
  const selectedTreeEntry =
    displayedCollectionKind === 'tree' && selectedCollectionSlot !== null
      ? treeWheelEntries[selectedCollectionSlot]
      : null;
  const selectedTreeSpeciesId = selectedTreeEntry?.id ?? speciesId;
  const selectedTreeDetailLabel = selectedTreeEntry?.label ?? treeSpeciesLabel;
  const selectedTreeVerse = getStableTreeVerse(`species:${selectedTreeSpeciesId}`);
  const selectedTreeStageImages =
    TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES[selectedTreeSpeciesId] ??
    TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple;
  const resolvedSelectedTreeStageImages = selectedTreeStageImages.map((source, stageIndex) => ({
    id: `${selectedTreeSpeciesId}-stage-${stageIndex + 1}`,
    speciesId: selectedTreeSpeciesId,
    speciesLabel: selectedTreeDetailLabel,
    stageIndex,
    source: getBundledGrowImageSource(source),
  }));
  const selectedTreeDetailImage =
    resolvedSelectedTreeStageImages[selectedTreeStageIndex]?.source ??
    selectedTreeEntry?.image ??
    resolvedStageAsset;
  const showingTreeDetail = Boolean(selectedTreeEntry?.unlocked);
  const collectionPreviewWarmupSources = useMemo(
    () =>
      [
        ...treeWheelEntries.map((entry) => entry.image),
        ...animalWheelEntries.map((entry) => entry.image),
        ...resolvedSelectedTreeStageImages.map((entry) => entry.source),
      ].filter(isGrowImageSource),
    [animalWheelEntries, resolvedSelectedTreeStageImages, treeWheelEntries],
  );
  const currentGrowScenePreloadSources = useMemo(
    () =>
      [
        resolvedScenePreviewImage,
        resolvedStagePreviewAsset,
      ].filter(isGrowImageSource),
    [
      resolvedScenePreviewImage,
      resolvedStagePreviewAsset,
    ],
  );
  const currentGrowDeferredPreloadSources = useMemo(
    () =>
      [
        resolvedSceneBackground,
        resolvedSceneStillLayer,
        resolvedSceneBreezeLayer,
        resolvedStageAsset,
        resolvedNextFieldPreviewImage,
        resolvedNextFieldImage,
      ].filter(isGrowImageSource),
    [
      resolvedNextFieldImage,
      resolvedNextFieldPreviewImage,
      resolvedSceneBackground,
      resolvedSceneBreezeLayer,
      resolvedSceneStillLayer,
      resolvedStageAsset,
    ],
  );
  const currentRoamingAnimalPreloadSources = useMemo(
    () =>
      roamingAnimalEntries
        .flatMap(({ imageAssets }) => [
          imageAssets.walkingImage,
          imageAssets.idleImage,
        ])
        .filter(isGrowImageSource),
    [roamingAnimalEntries],
  );
  const forestRoamingAnimalPreloadSources = useMemo(
    () =>
      forestRoamingAnimalEntries
        .flatMap(({ imageAssets }) => [
          imageAssets.walkingImage,
          imageAssets.idleImage,
        ])
        .filter(isGrowImageSource),
    [forestRoamingAnimalEntries],
  );
  const currentGrowPreloadKey = useMemo(
    () => currentGrowScenePreloadSources.map(getGrowImageSourceSignature).join('|'),
    [currentGrowScenePreloadSources],
  );
  const currentRoamingAnimalPreloadKey = useMemo(
    () => currentRoamingAnimalPreloadSources.map(getGrowImageSourceSignature).join('|'),
    [currentRoamingAnimalPreloadSources],
  );
  const forestRoamingAnimalPreloadKey = useMemo(
    () => forestRoamingAnimalPreloadSources.map(getGrowImageSourceSignature).join('|'),
    [forestRoamingAnimalPreloadSources],
  );
  const currentGrowAssetsReady = currentGrowAssetsReadyKey === currentGrowPreloadKey;
  const currentRoamingAnimalAssetsReady =
    currentRoamingAnimalPreloadSources.length === 0 ||
    currentRoamingAnimalAssetsReadyKey === currentRoamingAnimalPreloadKey;
  const forestRoamingAnimalAssetsReady =
    forestRoamingAnimalPreloadSources.length === 0 ||
    forestRoamingAnimalAssetsReadyKey === forestRoamingAnimalPreloadKey;
  const deferredGrowPreloadSources = useMemo(
    () =>
      getUniqueGrowImageSources([
        ...currentGrowDeferredPreloadSources,
        FOREST_FLAT_MAP.image,
        ...forestDioramaEntries.map((entry) => entry.image),
        ...mapPreviewWarmupSources,
        ...collectionPreviewWarmupSources,
      ]),
    [
      collectionPreviewWarmupSources,
      currentGrowDeferredPreloadSources,
      forestDioramaEntries,
      mapPreviewWarmupSources,
    ],
  );
  const forestDioramaCriticalPreloadSources = useMemo(
    () =>
      [
        FOREST_FLAT_MAP.image,
      ].filter(isGrowImageSource),
    [],
  );
  const forestDioramaDeferredPreloadSources = useMemo(
    () =>
      forestDioramaEntries.map((entry) => entry.image).filter(isGrowImageSource),
    [forestDioramaEntries],
  );
  const forestDioramaPreloadKey = useMemo(
    () => forestDioramaCriticalPreloadSources.map(getGrowImageSourceSignature).join('|'),
    [forestDioramaCriticalPreloadSources],
  );
  const forestDioramaAssetsReady = forestDioramaAssetsReadyKey === forestDioramaPreloadKey;
  const currentGrowAssetsReadyForRender = shouldTreatSceneAssetsAsReady({
    sceneAssetsReady: currentGrowAssetsReady,
    sceneHasRendered: growSceneHasRendered,
  });
  const shouldMountForestDioramaContent = shouldKeepOpenedOverlayMounted({
    hasOpened: forestHasOpened,
    isVisible: forestVisible,
  });
  const shouldMountMapContent = shouldKeepOpenedOverlayMounted({
    hasOpened: mapHasOpened,
    isVisible: mapVisible,
  });
  const shouldMountCollectionContent = shouldKeepOpenedOverlayMounted({
    hasOpened: collectionHasOpened,
    isVisible: activeCollection !== null,
  });
  const forestDioramaSceneReady = shouldTreatSceneAssetsAsReady({
    sceneAssetsReady: forestDioramaAssetsReady,
    sceneHasRendered: forestDioramaSceneHasRendered,
  }) || forestVisible;
  const growSceneContentReady = shouldRenderGrowSceneContent({
    adminStatusReady,
    completedTreeCountReady,
    currentAssetsReady: currentGrowAssetsReadyForRender,
    growPreferencesReady,
    treeSnapshotReady,
  });
  const roamingAnimalsReady = shouldRenderRoamingAnimals({
    currentAssetsReady: currentRoamingAnimalAssetsReady,
    growPreferencesReady,
  });
  const forestRoamingAnimalsReady = shouldRenderForestRoamingAnimals({
    forestAnimalAssetsReady: forestRoamingAnimalAssetsReady,
    forestSceneReady: forestDioramaSceneReady,
    forestVisible,
    growPreferencesReady,
  });
  const shouldWarmOverlayAssets = shouldWarmGrowOverlayAssets({
    growSceneContentReady,
    growSceneHasRendered,
  });

  useEffect(() => {
    let mounted = true;
    const preloadKey = currentGrowPreloadKey;

    setCurrentGrowAssetsReadyKey(null);
    preloadGrowScreenAssets()
      .then(() => preloadGrowImageSources(currentGrowScenePreloadSources, { chunkSize: 3 }))
      .then(() => {
        if (mounted) {
          setCurrentGrowAssetsReadyKey(preloadKey);
        }
      })
      .catch((error) => {
        console.warn('Could not warm current grow assets.', error);

        if (mounted) {
          setCurrentGrowAssetsReadyKey(preloadKey);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentGrowPreloadKey, currentGrowScenePreloadSources]);

  useEffect(() => {
    let mounted = true;
    const preloadKey = currentRoamingAnimalPreloadKey;

    if (currentRoamingAnimalPreloadSources.length === 0) {
      setCurrentRoamingAnimalAssetsReadyKey(preloadKey);
      return undefined;
    }

    setCurrentRoamingAnimalAssetsReadyKey(null);
    preloadGrowImageSources(currentRoamingAnimalPreloadSources, { chunkSize: 2 })
      .then(() => {
        if (mounted) {
          setCurrentRoamingAnimalAssetsReadyKey(preloadKey);
        }
      })
      .catch((error) => {
        console.warn('Could not warm roaming animal assets.', error);

        if (mounted) {
          setCurrentRoamingAnimalAssetsReadyKey(preloadKey);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentRoamingAnimalPreloadKey, currentRoamingAnimalPreloadSources]);

  useEffect(() => {
    const preloadKey = forestRoamingAnimalPreloadKey;

    if (forestRoamingAnimalPreloadSources.length === 0) {
      setForestRoamingAnimalAssetsReadyKey(preloadKey);
      return undefined;
    }

    if (!shouldWarmOverlayAssets && !forestHasOpened && !forestVisible) {
      return undefined;
    }

    let cancelled = false;
    setForestRoamingAnimalAssetsReadyKey(null);
    const timer = setTimeout(() => {
      if (cancelled) {
        return;
      }

      void preloadGrowImageSources(forestRoamingAnimalPreloadSources, { chunkSize: 2 })
        .then(() => {
          if (!cancelled) {
            setForestRoamingAnimalAssetsReadyKey(preloadKey);
          }
        })
        .catch((error) => {
          console.warn('Could not warm forest animal assets.', error);

          if (!cancelled) {
            setForestRoamingAnimalAssetsReadyKey(preloadKey);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    forestHasOpened,
    forestRoamingAnimalPreloadKey,
    forestRoamingAnimalPreloadSources,
    forestVisible,
    shouldWarmOverlayAssets,
  ]);

  useEffect(() => {
    if (!shouldWarmOverlayAssets) {
      return undefined;
    }

    const timer = setTimeout(() => {
      void preloadGrowImageSources(deferredGrowPreloadSources, {
        cachePolicy: 'disk',
        chunkSize: 3,
      }).catch((error) => {
        console.warn('Could not warm deferred grow assets.', error);
      });
    }, 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [deferredGrowPreloadSources, shouldWarmOverlayAssets]);

  useEffect(() => {
    if (!forestHasOpened && !forestVisible) {
      return undefined;
    }

    let mounted = true;
    const preloadKey = forestDioramaPreloadKey;

    setForestDioramaAssetsReadyKey(null);
    preloadGrowImageSources(forestDioramaCriticalPreloadSources, { chunkSize: 1 })
      .then(() => {
        if (mounted) {
          setForestDioramaAssetsReadyKey(preloadKey);
        }
      })
      .catch((error) => {
        console.warn('Could not warm diorama assets.', error);

        if (mounted) {
          setForestDioramaAssetsReadyKey(preloadKey);
        }
      });

    return () => {
      mounted = false;
    };
  }, [forestDioramaCriticalPreloadSources, forestDioramaPreloadKey, forestHasOpened, forestVisible]);

  useEffect(() => {
    if ((!forestHasOpened && !forestVisible) || forestDioramaDeferredPreloadSources.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) {
        return;
      }

      void preloadGrowImageSources(forestDioramaDeferredPreloadSources, {
        cachePolicy: 'memory-disk',
        chunkSize: 3,
      }).catch((error) => {
        console.warn('Could not warm forest tree assets.', error);
      });
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [forestDioramaDeferredPreloadSources, forestHasOpened, forestVisible]);
  const forestDioramaSceneOpacity = forestDioramaThemeTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const forestDioramaSceneScale = forestDioramaThemeTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const forestDioramaSceneTranslateY = forestDioramaThemeTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  useEffect(() => {
    if (growSceneContentReady && !growSceneHasRendered) {
      setGrowSceneHasRendered(true);
    }
  }, [growSceneContentReady, growSceneHasRendered]);

  useEffect(() => {
    if (forestDioramaAssetsReady && !forestDioramaSceneHasRendered) {
      setForestDioramaSceneHasRendered(true);
    }
  }, [forestDioramaAssetsReady, forestDioramaSceneHasRendered]);

  if (!growSceneContentReady) {
    return (
      <SafeAreaView edges={[]} style={styles.loadingSafeArea}>
        <View style={styles.loadingPanel}>
          <View style={styles.loadingSeedIcon}>
            <View style={styles.loadingSeedLeaf} />
            <View style={styles.loadingSeedStem} />
          </View>
          <Text style={styles.loadingTitle}>Loading garden</Text>
          <Text style={styles.loadingCopy}>Preparing the current map and tree.</Text>
          <View style={styles.loadingTrack}>
            <View style={[styles.loadingFill, { width: currentGrowAssetsReady ? '86%' : '54%' }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={styles.scene}>
        <AnimatedExpoImage
          source={resolvedSceneBackground}
          placeholder={resolvedScenePreviewImage}
          placeholderContentFit="cover"
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={`grow-scene-background-${sceneLayers.id}`}
          style={[
            styles.groundBackground,
            {
              transform: [{ translateY: currentSceneTranslateY }, { scale: 1.02 }],
            },
          ]}
        />
        {hasSceneStillLayer || hasSceneBreezeLayer ? (
          <>
            {resolvedSceneStillLayer ? (
              <AnimatedExpoImage
                source={resolvedSceneStillLayer}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`grow-scene-still-${sceneLayers.id}`}
                style={[
                  styles.groundBackground,
                  styles.forestTreeLayer,
                  {
                    transform: [{ translateY: currentSceneTranslateY }, { scale: 1.02 }],
                  },
                ]}
              />
            ) : null}
            {resolvedSceneBreezeLayer ? (
              <AnimatedExpoImage
                source={resolvedSceneBreezeLayer}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`grow-scene-breeze-${sceneLayers.id}`}
                style={[
                  styles.groundBackground,
                  styles.forestLeafLayer,
                  {
                    transform: [
                      { translateY: currentSceneTranslateY },
                      { translateX: forestLeavesTranslateX },
                      { translateY: forestLeavesTranslateY },
                      { scale: 1.02 },
                      { scaleX: forestLeavesScaleX },
                    ],
                  },
                ]}
              />
            ) : null}
          </>
        ) : null}
        {isNightSkyScene ? (
          <View pointerEvents="none" style={styles.nightSkySparkleLayer}>
            {NIGHT_SKY_SPARKLES.map((sparkle) => (
              <Animated.View
                key={`night-sparkle-${sparkle.id}`}
                style={[
                  styles.nightSkySparkle,
                  {
                    left: `${sparkle.x}%`,
                    top: `${sparkle.y}%`,
                    width: sparkle.size,
                    height: sparkle.size,
                    borderRadius: sparkle.size,
                  },
                  nightSkyTwinkleStyles[sparkle.phase],
                ]}>
                <View
                  style={[
                    styles.nightSkySparkleVerticalRay,
                    {
                      height: sparkle.size * 4.4,
                      marginTop: -sparkle.size * 1.7,
                      borderRadius: sparkle.size,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.nightSkySparkleHorizontalRay,
                    {
                      width: sparkle.size * 4.4,
                      marginLeft: -sparkle.size * 1.7,
                      borderRadius: sparkle.size,
                    },
                  ]}
                />
                <View style={styles.nightSkySparkleCore} />
              </Animated.View>
            ))}
          </View>
        ) : null}
        {showNextScene ? (
          <AnimatedExpoImage
            source={resolvedNextFieldImage}
            placeholder={resolvedNextFieldPreviewImage}
            placeholderContentFit="cover"
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey="grow-next-scene-wilderness"
            style={[
              styles.groundBackground,
              {
                transform: [{ translateY: nextSceneTranslateY }, { scale: 1.02 }],
              },
            ]}
          />
        ) : null}
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.currentTreeWrap, { bottom: treeBottomOffset }]}>
            <View style={[styles.currentTreeLayerStack, { width: treeArtSize, height: treeArtSize }]}>
            <View
              style={[
                styles.currentTreeBaseClip,
                {
                  top: treeBaseLayerTop,
                  height: treeArtSize - treeBaseLayerTop,
                },
              ]}>
              <ExpoImage
                source={resolvedStageAsset}
                placeholder={resolvedStagePreviewAsset}
                placeholderContentFit="contain"
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`current-tree-base-${speciesId}-${stage}`}
                style={[
                  styles.currentTreeImage,
                  {
                    width: treeArtSize,
                    height: treeArtSize,
                    transform: [{ translateY: -treeBaseLayerTop }],
                  },
                ]}
                accessible={false}
              />
            </View>
            <Animated.View
              style={[
                styles.currentTreeLeafClip,
                styles.currentTreeLeafClipLeft,
                {
                  width: treeArtSize * 0.42,
                  height: treeLeafLayerHeight,
                  transform: [
                    { translateX: treeLeftBreezeTranslateX },
                    { translateY: treeLeftBreezeTranslateY },
                    { rotate: treeLeftBreezeRotate },
                    { scaleX: treeLeftBreezeScaleX },
                  ],
                },
              ]}>
              <ExpoImage
                source={resolvedStageAsset}
                placeholder={resolvedStagePreviewAsset}
                placeholderContentFit="contain"
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`current-tree-left-${speciesId}-${stage}`}
                style={[styles.currentTreeImage, { width: treeArtSize, height: treeArtSize }]}
                accessible={false}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.currentTreeLeafClip,
                styles.currentTreeLeafClipCenter,
                {
                  left: treeArtSize * 0.29,
                  width: treeArtSize * 0.42,
                  height: treeLeafLayerHeight,
                  transform: [
                    { translateX: treeCenterBreezeTranslateX },
                    { translateY: treeCenterBreezeTranslateY },
                    { rotate: treeCenterBreezeRotate },
                    { scaleX: treeCenterBreezeScaleX },
                  ],
                },
              ]}>
              <ExpoImage
                source={resolvedStageAsset}
                placeholder={resolvedStagePreviewAsset}
                placeholderContentFit="contain"
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`current-tree-center-${speciesId}-${stage}`}
                style={[
                  styles.currentTreeImage,
                  {
                    width: treeArtSize,
                    height: treeArtSize,
                    transform: [{ translateX: -treeArtSize * 0.29 }],
                  },
                ]}
                accessible={false}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.currentTreeLeafClip,
                styles.currentTreeLeafClipRight,
                {
                  left: treeArtSize * 0.58,
                  width: treeArtSize * 0.42,
                  height: treeLeafLayerHeight,
                  transform: [
                    { translateX: treeRightBreezeTranslateX },
                    { translateY: treeRightBreezeTranslateY },
                    { rotate: treeRightBreezeRotate },
                    { scaleX: treeRightBreezeScaleX },
                  ],
                },
              ]}>
              <ExpoImage
                source={resolvedStageAsset}
                placeholder={resolvedStagePreviewAsset}
                placeholderContentFit="contain"
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`current-tree-right-${speciesId}-${stage}`}
                style={[
                  styles.currentTreeImage,
                  {
                    width: treeArtSize,
                    height: treeArtSize,
                    transform: [{ translateX: -treeArtSize * 0.58 }],
                  },
                ]}
                accessible={false}
              />
            </Animated.View>
            </View>
        </View>

        {roamingAnimalsReady
          ? roamingAnimalEntries.map(({ companion, imageAssets, previewImage }, index) => (
              <RoamingAnimal
                key={companion.id}
                bottom={roamingAnimalBottom + getRoamingAnimalLayerOffsetY({ index, size: roamingAnimalSize })}
                companion={companion}
                imageAssets={imageAssets}
                index={index}
                previewImage={previewImage}
                reduceMotion={shouldReduceMotion}
                sceneWidth={width}
                size={roamingAnimalSize}
              />
            ))
          : null}

        <Animated.View style={[styles.growthSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <AnimatedPressable
            style={[
              styles.pullTabHitArea,
              {
                opacity: pullTabOpacity,
                transform: [{ scale: pullTabScale }],
              },
            ]}
            pointerEvents={sheetOpen ? 'none' : 'auto'}
            onPress={() => animateSheet(true)}
            {...sheetPanResponder.panHandlers}
            accessibilityRole="button"
            accessibilityState={{ expanded: sheetOpen }}
            accessibilityLabel={sheetOpen ? 'Hide seed growth details' : 'Show seed growth details'}>
            <View style={styles.pullTabClip}>
              <View style={styles.pullTab}>
                <View style={styles.pullTabArrow} />
              </View>
            </View>
          </AnimatedPressable>
          <View style={styles.sheetContent}>
            <Pressable
              style={styles.sheetDragZone}
              onPress={() => animateSheet(false)}
              {...sheetPanResponder.panHandlers}
              accessibilityRole="button"
              accessibilityState={{ expanded: sheetOpen }}
              accessibilityLabel="Drag down to hide seed growth details">
              <View style={styles.sheetDragHandle} />
            </Pressable>
            <View style={styles.sheetBody}>
              <View
                style={styles.seedProgressCard}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Current stage ${stageLabel}. ${stageProgressPercent} percent toward the next stage.`}
                accessibilityValue={{ min: 0, max: 100, now: stageProgressPercent, text: `${stageProgressPercent}%` }}>
                <View style={styles.seedProgressTopRow}>
                  <View style={styles.seedProgressColumn}>
                    <Text style={styles.seedProgressLabel}>Stage</Text>
                    <Text style={styles.seedProgressValue}>{stageLabel}</Text>
                  </View>
                  <View style={[styles.seedProgressColumn, styles.seedProgressColumnRight]}>
                    <Text style={styles.seedProgressLabel}>Progress</Text>
                    <Text style={styles.seedProgressPercent}>{stageProgressPercent}%</Text>
                  </View>
                </View>
                <View style={styles.stageProgressTrack}>
                  <View style={[styles.stageProgressFill, { width: `${stageProgressPercent}%` }]} />
                </View>
              </View>
              {isAdminUser ? (
                <View style={styles.adminTreeControls}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.adminTreeToggle,
                      pressed && styles.adminTreeTogglePressed,
                    ]}
                    onPress={() => setAdminControlsOpen((isOpen) => !isOpen)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: adminControlsOpen }}
                    accessibilityLabel="Open admin tree growth controls">
                    <Text style={styles.adminTreeToggleText}>Admin tree controls</Text>
                    <Text style={styles.adminTreeToggleValue}>{tree?.growthPoints ?? 0}/7</Text>
                  </Pressable>
                  {adminControlsOpen ? (
                    <View style={styles.adminTreeActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.adminTreeAction,
                          (pressed || adminGrowthBusy) && styles.adminTreeActionPressed,
                        ]}
                        disabled={adminGrowthBusy || !tree || tree.growthPoints <= 0}
                        onPress={() => adjustTreeGrowthAsAdmin(-1)}
                        accessibilityRole="button"
                        accessibilityLabel="Regress tree by one growth step">
                        <Text style={styles.adminTreeActionText}>Regress</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.adminTreeAction,
                          styles.adminTreeActionPrimary,
                          (pressed || adminGrowthBusy) && styles.adminTreeActionPressed,
                        ]}
                        disabled={adminGrowthBusy || !tree}
                        onPress={() => adjustTreeGrowthAsAdmin(1)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          tree && tree.growthPoints >= COMPLETE_GROWTH_POINTS
                            ? 'Evolve completed tree into the next seed'
                            : 'Evolve tree by one growth step'
                        }>
                        <Text style={[styles.adminTreeActionText, styles.adminTreeActionPrimaryText]}>
                          Evolve
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {adminGrowthError ? (
                    <Text style={styles.adminTreeError}>{adminGrowthError}</Text>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.verseCard}>
                <Text style={styles.verseTheme}>{growthVerse.theme}</Text>
                <Text style={styles.verseExcerpt}>{growthVerse.excerpt}</Text>
                <Text style={styles.verseReference}>{growthVerse.reference}</Text>
              </View>
              <View style={styles.sheetActionGrid}>
                <SheetActionButton kind="forest" title="Forest" onPress={openForestDiorama} />
                <SheetActionButton kind="map" title="Map" onPress={openMapPicker} />
                <SheetActionButton kind="collection" title="Collection" onPress={openCollectionBook} />
              </View>
            </View>
          </View>
        </Animated.View>
        <HiddenGrowImageWarmers
          enabled={mapHasOpened}
          idPrefix="map-picker-warm"
          sources={mapPreviewWarmupSources}
        />
        <HiddenGrowImageWarmers
          enabled={collectionHasOpened}
          idPrefix="collection-book-warm"
          sources={collectionPreviewWarmupSources}
        />
        <Modal
          visible={forestVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setForestVisible(false)}>
          {shouldMountForestDioramaContent ? (
          <SafeAreaView
            edges={['top', 'bottom']}
            style={[
              styles.forestDioramaScreen,
              { backgroundColor: selectedDioramaTheme.backgroundColor },
            ]}
            accessibilityViewIsModal>
            <View style={styles.forestDioramaControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.forestDioramaIconButton,
                  pressed && styles.forestDioramaIconButtonPressed,
                ]}
                onPress={() => setForestVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close faith forest">
                <UtilityIcon type="close" size={24} color="#2a1c13" />
              </Pressable>
            </View>
            {forestDioramaSceneReady ? (
              <View style={styles.forestDioramaContent}>
                <Animated.View
                  style={[
                    styles.forestDioramaStageMotion,
                    {
                      opacity: forestDioramaSceneOpacity,
                      transform: [
                        { translateY: forestDioramaSceneTranslateY },
                        { scale: forestDioramaSceneScale },
                      ],
                    },
                ]}>
                  <View style={[styles.forestDioramaStage, { minHeight: height }]}>
                    <View
                      style={styles.forestDioramaPlatform}
                      {...forestDioramaPanResponder.panHandlers}>
                      <Animated.View
                        style={[
                          styles.forestDioramaPanLayer,
                          {
                            transform: [
                              { translateX: forestDioramaPan.x },
                              { translateY: forestDioramaPan.y },
                              { scale: forestDioramaZoom },
                            ],
                          },
                        ]}
                        onLayout={(event) => {
                          setForestDioramaBoardWidth(event.nativeEvent.layout.width);
                          setForestDioramaBoardHeight(event.nativeEvent.layout.height);
                        }}>
                        <ForestDioramaBoard source={selectedDioramaTheme.image} />
                        {FOREST_DIORAMA_SLOTS.map((slot, index) => {
                          const entry = forestDioramaEntries[index];

                          if (!entry) {
                            return null;
                          }

                          const slotMetrics = getForestDioramaScaledSlotMetrics({
                            renderedBoardHeight: forestDioramaBoardHeight,
                            renderedBoardWidth: forestDioramaBoardWidth,
                            slot,
                          });

                          return (
                            <ForestDioramaTreeSlot
                              key={`forest-slot-${index}`}
                              breeze={forestDioramaDrift}
                              entry={entry}
                              index={index}
                              slotMetrics={slotMetrics}
                            />
                          );
                        })}
                        {forestRoamingAnimalsReady
                          ? forestRoamingAnimalEntries.map(({ companion, imageAssets, previewImage }, index) => (
                              <RoamingAnimal
                                key={`forest-${companion.id}`}
                                area="forest"
                                companion={companion}
                                imageAssets={imageAssets}
                                index={index}
                                layerZIndex={getForestDioramaAnimalLayerZIndex({ index })}
                                maxVisualWidth={forestRoamingAnimalMaxVisualWidth}
                                previewImage={previewImage}
                                reduceMotion={shouldReduceMotion}
                                sceneHeight={forestDioramaBoardHeight}
                                sceneWidth={forestDioramaBoardWidth}
                                size={forestRoamingAnimalSize}
                                top={0}
                              />
                            ))
                          : null}
                      </Animated.View>
                    </View>
                  </View>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.forestDioramaLoading}>
                <View style={styles.loadingPanel}>
                  <View style={styles.loadingSeedIcon}>
                    <View style={styles.loadingSeedLeaf} />
                    <View style={styles.loadingSeedStem} />
                  </View>
                  <Text style={styles.loadingTitle}>Loading forest</Text>
                  <Text style={styles.loadingCopy}>Preparing this diorama.</Text>
                  <View style={styles.loadingTrack}>
                    <View style={[styles.loadingFill, { width: '62%' }]} />
                  </View>
                </View>
              </View>
            )}
          </SafeAreaView>
          ) : null}
        </Modal>
        <Modal
          visible={mapVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setMapVisible(false)}>
          {shouldMountMapContent ? (
          <SafeAreaView edges={['top', 'bottom']} style={styles.overlayScreen} accessibilityViewIsModal>
            <OverlayHeader title="Seed Map" onClose={() => setMapVisible(false)} />
            <ScrollView
              ref={mapScrollRef}
              horizontal
              decelerationRate="fast"
              snapToAlignment="center"
              snapToInterval={wheelSnapInterval}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                mapScrollOffset.current = event.nativeEvent.contentOffset.x;
              }}
              onMomentumScrollEnd={(event) => {
                const nextIndex = getWheelScrollIndex(event, wheelSnapInterval, mapWheelEntries.length);

                mapScrollOffset.current = nextIndex * wheelSnapInterval;
                setSelectedMapIndex(nextIndex);
              }}
              onScrollEndDrag={(event) => {
                const nextIndex = getWheelScrollIndex(event, wheelSnapInterval, mapWheelEntries.length);

                mapScrollOffset.current = nextIndex * wheelSnapInterval;
                setSelectedMapIndex(nextIndex);
              }}
              {...(Platform.OS === 'web' ? mapWheelPanResponder.panHandlers : {})}
              contentContainerStyle={[styles.wheelContent, { paddingHorizontal: wheelSidePadding }]}>
              {mapWheelEntries.map((area, index) => {
                const isSelected = index === selectedMapIndex;
                const isUnlocked = area.unlocked;
                const mapSelectionStatus = getGrowMapAreaSelectionStatus({
                  currentSceneId: sceneLayers.id,
                  isUnlocked,
                  sceneId: area.scene.id,
                });
                const isCurrentMap = mapSelectionStatus === 'current';
                const mapKicker =
                  mapSelectionStatus === 'current'
                    ? 'Current map'
                    : mapSelectionStatus === 'available'
                      ? 'Available'
                      : 'Locked';
                const mapTitle = isUnlocked ? area.title : 'Locked place';
                const mapCopy = isUnlocked
                  ? isCurrentMap
                    ? `${area.subtitle}. This is the map in use now.`
                    : area.subtitle
                  : `Opens after ${area.unlocksAtFruitBearingTreeCount} fruiting tree${
                      area.unlocksAtFruitBearingTreeCount === 1 ? '' : 's'
                    }.`;
                const mapActionDisabled = !isUnlocked || isCurrentMap;

                return (
                  <View
                    key={area.id}
                    style={[
                      styles.wheelSlide,
                      {
                        width: wheelCardWidth,
                        marginRight: index === mapWheelEntries.length - 1 ? 0 : wheelCardGap,
                      },
                    ]}>
                    <View
                      style={[
                        styles.mapReferenceCard,
                        isSelected && styles.wheelCardSelected,
                        isCurrentMap && styles.mapReferenceCardCurrent,
                        !isUnlocked && styles.mapReferenceCardLocked,
                      ]}>
                      <View style={styles.mapReferenceArt}>
                        <ExpoImage
                          accessibilityIgnoresInvertColors
                          source={area.image}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          style={[styles.mapReferenceImage, !isUnlocked && styles.mapReferenceImageLocked]}
                        />
                        {!isUnlocked ? (
                          <View style={styles.mapReferenceLockedShade}>
                            <Text style={styles.mapReferenceLockedText}>Locked</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.mapReferenceBody}>
                        <Text style={[
                          styles.mapReferenceKicker,
                          isCurrentMap && styles.mapReferenceKickerCurrent,
                          !isUnlocked && styles.mapReferenceKickerLocked,
                        ]}>
                          {mapKicker}
                        </Text>
                        <Text style={[styles.mapReferenceTitle, !isUnlocked && styles.mapReferenceTitleLocked]}>
                          {mapTitle}
                        </Text>
                        <Text style={styles.mapReferenceCopy}>{mapCopy}</Text>
                        <Pressable
                          disabled={mapActionDisabled}
                          onPress={() => selectMapScene(index)}
                          style={({ pressed }) => [
                            styles.mapReferenceSelectButton,
                            isCurrentMap && styles.mapReferenceSelectButtonCurrent,
                            !isUnlocked && styles.mapReferenceSelectButtonDisabled,
                            pressed && !mapActionDisabled && styles.mapReferenceSelectButtonPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: mapActionDisabled, selected: isCurrentMap }}
                          accessibilityLabel={
                            isCurrentMap
                              ? `${area.title} is the current map`
                              : isUnlocked
                                ? `Use ${area.title} map`
                                : `${area.title} map is locked`
                          }>
                          <Text
                            style={[
                              styles.mapReferenceSelectText,
                              isCurrentMap && styles.mapReferenceSelectTextCurrent,
                              !isUnlocked && styles.mapReferenceSelectTextDisabled,
                            ]}>
                            {isCurrentMap ? 'Current map' : isUnlocked ? 'Use map' : 'Locked'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </SafeAreaView>
          ) : null}
        </Modal>
        <Modal
          visible={activeCollection !== null}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeCollection}>
          {shouldMountCollectionContent ? (
          <SafeAreaView
            edges={['top', 'bottom']}
            style={styles.collectionScreen}
            accessibilityViewIsModal>
            <View style={styles.collectionScreenHeader}>
              {showingTreeDetail ? (
                <Pressable
                  style={styles.collectionHeaderButton}
                  onPress={() => {
                    setSelectedTreeStageIndex(4);
                    setSelectedCollectionSlot(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to collection grid">
                  <Text style={styles.collectionHeaderButtonText}>Back</Text>
                </Pressable>
              ) : (
                <View style={styles.collectionHeaderButtonPlaceholder} />
              )}
              <View style={styles.collectionHeaderTitleBlock}>
                <View style={styles.collectionHeaderLogoFrame}>
                  <BlessiLogo imageStyle={styles.collectionHeaderLogoImage} />
                </View>
                <Text style={styles.collectionModalTitle}>{activeCollectionTitle}</Text>
              </View>
              <Pressable
                style={styles.collectionModalClose}
                onPress={closeCollection}
                accessibilityRole="button"
                accessibilityLabel="Exit collection book"
                accessibilityHint="Closes the collection screen.">
                <Text style={styles.collectionModalCloseText}>×</Text>
              </Pressable>
            </View>
            {!showingTreeDetail ? (
              <View style={styles.collectionTabs}>
                <Pressable
                  onPress={() => openCollection('tree')}
                  style={[
                    styles.collectionTab,
                    displayedCollectionKind === 'tree' && styles.collectionTabActive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: displayedCollectionKind === 'tree' }}
                  accessibilityLabel="Show tree collection">
                  <Text
                    style={[
                      styles.collectionTabText,
                      displayedCollectionKind === 'tree' && styles.collectionTabTextActive,
                    ]}>
                    Trees
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openCollection('animal')}
                  style={[
                    styles.collectionTab,
                    displayedCollectionKind === 'animal' && styles.collectionTabActive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: displayedCollectionKind === 'animal' }}
                  accessibilityLabel="Show animal collection">
                  <Text
                    style={[
                      styles.collectionTabText,
                      displayedCollectionKind === 'animal' && styles.collectionTabTextActive,
                    ]}>
                    Animals
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {showingTreeDetail ? (
              <ScrollView
                style={styles.collectionDetailScroll}
                contentContainerStyle={styles.collectionDetailContent}
                showsVerticalScrollIndicator={false}>
                <View style={styles.treeDetailHero}>
                  <ExpoImage
                    accessibilityIgnoresInvertColors
                    source={selectedTreeDetailImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    style={styles.treeDetailHeroImage}
                  />
                </View>
                <Text style={styles.treeDetailEyebrow}>Unlocked tree</Text>
                <Text style={styles.treeDetailTitle}>{selectedTreeDetailLabel}</Text>
                <Text style={styles.treeDetailCopy}>
                  This tree grows through prayer requests you share and prayers you carry for others.
                </Text>

                <View style={styles.treeDetailStatsRow}>
                  <View style={styles.treeDetailStat}>
                    <Text style={styles.treeDetailStatValue}>{plantedAtLabel}</Text>
                    <Text style={styles.treeDetailStatLabel}>Planted</Text>
                  </View>
                  <View style={styles.treeDetailStat}>
                    <Text style={styles.treeDetailStatValue}>5 steps</Text>
                    <Text style={styles.treeDetailStatLabel}>Seed to fruit</Text>
                  </View>
                </View>
                <View style={styles.treeDetailStatsRow}>
                  <View style={styles.treeDetailStat}>
                    <Text style={styles.treeDetailStatValue}>{sharedPrayerCount}</Text>
                    <Text style={styles.treeDetailStatLabel}>Shared prayers</Text>
                  </View>
                  <View style={styles.treeDetailStat}>
                    <Text style={styles.treeDetailStatValue}>{carriedPrayerCount}</Text>
                    <Text style={styles.treeDetailStatLabel}>Prayers carried</Text>
                  </View>
                </View>

                <View style={styles.treeDetailSection}>
                  <Text style={styles.treeDetailSectionTitle}>Growth stages</Text>
                  <View style={styles.treeDetailStageRow}>
                    {resolvedSelectedTreeStageImages.map((stageEntry) => (
                      <Pressable
                        key={stageEntry.id}
                        onPress={() => setSelectedTreeStageIndex(stageEntry.stageIndex)}
                        style={({ pressed }) => [
                          styles.treeDetailStageCell,
                          { width: treeDetailStageCellWidth },
                          stageEntry.stageIndex === selectedTreeStageIndex && styles.treeDetailStageCellActive,
                          pressed && styles.treeDetailStageCellPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: stageEntry.stageIndex === selectedTreeStageIndex }}
                        accessibilityLabel={`Show ${stageEntry.speciesLabel} stage ${stageEntry.stageIndex + 1}`}>
                        <ExpoImage
                          accessibilityIgnoresInvertColors
                          source={stageEntry.source}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          style={styles.treeDetailStageImage}
                        />
                        <Text numberOfLines={1} style={styles.treeDetailStageSpecies}>
                          {stageEntry.speciesLabel}
                        </Text>
                        <Text style={styles.treeDetailStageLabel}>Stage {stageEntry.stageIndex + 1}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.treeDetailVerseCard}>
                  <Text style={styles.verseTheme}>{selectedTreeVerse.theme}</Text>
                  <Text style={styles.verseExcerpt}>{selectedTreeVerse.excerpt}</Text>
                  <Text style={styles.verseReference}>{selectedTreeVerse.reference}</Text>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.collectionSlides}
                contentContainerStyle={styles.collectionDexGridContent}
                showsVerticalScrollIndicator={false}>
                {collectionWheelEntries.map((entry, index) => {
                  const treeEntry = displayedCollectionKind === 'tree' ? treeWheelEntries[index] : null;
                  const animalEntry = displayedCollectionKind === 'animal' ? animalWheelEntries[index] : null;
                  const isUnlockedTree = displayedCollectionKind === 'tree' && entry.unlocked;
                  const isUnlockedAnimal = displayedCollectionKind === 'animal' && entry.unlocked;
                  const isUnlocked = isUnlockedTree || isUnlockedAnimal;
                  const dexNumber = String(index + 1).padStart(3, '0');
                  const cardName = isUnlocked ? entry.label : 'Locked';
                  const isSelectedAnimal = Boolean(
                    isUnlockedAnimal && animalEntry && selectedAnimalIdSet.has(animalEntry.id),
                  );
                  const isOnlySelectedAnimal =
                    isSelectedAnimal && selectedRoamingCompanionIds.length <= 1;
                  const isAnimalSelectionAtCapacity = selectedRoamingCompanionIds.length >= 2;
                  const isAnimalSelectDisabled =
                    !isUnlockedAnimal ||
                    isOnlySelectedAnimal ||
                    (!isSelectedAnimal && isAnimalSelectionAtCapacity);
                  const animalSelectLabel = isSelectedAnimal
                    ? 'Selected'
                    : isAnimalSelectionAtCapacity
                      ? 'Max 2'
                      : 'Select';
                  const footerLabel = isUnlockedTree ? stageLabel : 'Locked';

                  return (
                    <Pressable
                      key={`${displayedCollectionKind}-${entry.id}`}
                      disabled={displayedCollectionKind === 'tree' && !isUnlockedTree}
                      onPress={isUnlockedTree ? () => openTreeDetail(index) : undefined}
                      style={({ pressed }) => [
                        styles.collectionDexCard,
                        { width: collectionDexCardWidth },
                        isUnlocked && styles.collectionDexCardUnlocked,
                        isSelectedAnimal && styles.collectionDexCardSelectedAnimal,
                        pressed && styles.collectionDexCardPressed,
                      ]}
                      accessible={!isUnlockedAnimal}
                      accessibilityRole={isUnlockedTree ? 'button' : 'text'}
                      accessibilityLabel={
                        isUnlockedTree
                          ? `Open ${cardName} details.`
                          : isUnlockedAnimal
                            ? `${cardName} is unlocked.`
                          : `Locked ${activeCollectionTitle} slot ${index + 1}.`
                      }>
                      <View style={styles.collectionDexHeader}>
                        <Text
                          style={[
                            styles.collectionDexNumber,
                            displayedCollectionKind === 'animal' && styles.collectionDexNumberAnimal,
                            !isUnlocked && styles.collectionDexNumberLocked,
                          ]}>
                          {dexNumber}
                        </Text>
                        <Text numberOfLines={1} style={styles.collectionDexName}>
                          {cardName}
                        </Text>
                      </View>
                      <View style={styles.collectionDexArt}>
                        {displayedCollectionKind === 'tree' ? (
                          <ExpoImage
                            accessibilityIgnoresInvertColors
                            source={treeEntry?.image ?? resolvedStageAsset}
                            tintColor={isUnlockedTree ? undefined : '#1F1711'}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            style={[
                              styles.collectionDexImage,
                              !isUnlockedTree && styles.collectionDexLockedTreeImage,
                            ]}
                          />
                        ) : isUnlockedAnimal && animalEntry?.image ? (
                          <ExpoImage
                            accessibilityIgnoresInvertColors
                            source={animalEntry.image}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            style={[styles.collectionDexImage, styles.collectionDexAnimalImage]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.collectionDexSilhouetteScale,
                              displayedCollectionKind === 'animal' && styles.collectionDexAnimalSilhouetteScale,
                            ]}>
                            <CollectionSilhouette
                              kind={displayedCollectionKind}
                              source={treeEntry?.image ?? animalEntry?.image ?? null}
                            />
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.collectionDexFooter,
                          displayedCollectionKind === 'animal' && styles.collectionDexFooterAnimal,
                        ]}>
                        {displayedCollectionKind === 'animal' ? (
                          isUnlockedAnimal && animalEntry ? (
                          <Pressable
                            disabled={isAnimalSelectDisabled}
                            onPress={() => toggleRoamingAnimalSelection(animalEntry.id)}
                            style={({ pressed }) => [
                              styles.collectionDexSelectButton,
                              isSelectedAnimal && styles.collectionDexSelectButtonActive,
                              isAnimalSelectDisabled && styles.collectionDexSelectButtonDisabled,
                              pressed && !isAnimalSelectDisabled && styles.collectionDexSelectButtonPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{
                              disabled: isAnimalSelectDisabled,
                              selected: isSelectedAnimal,
                            }}
                            accessibilityLabel={
                              isSelectedAnimal
                                ? `${animalEntry.label} is selected to roam`
                                : `Select ${animalEntry.label} to roam`
                            }>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.collectionDexSelectText,
                                isSelectedAnimal && styles.collectionDexSelectTextActive,
                                isAnimalSelectDisabled && styles.collectionDexSelectTextDisabled,
                              ]}>
                              {animalSelectLabel}
                            </Text>
                          </Pressable>
                          ) : (
                            <Text style={styles.collectionDexFooterText}>
                              {footerLabel}
                            </Text>
                          )
                        ) : (
                          <Text style={styles.collectionDexFooterText}>
                            {footerLabel}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </SafeAreaView>
          ) : null}
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3EA',
    paddingHorizontal: 26,
  },
  loadingPanel: {
    width: '100%',
    maxWidth: 328,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    ...stageProgressCardShadow,
  },
  loadingSeedIcon: {
    width: 58,
    height: 58,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.9)',
  },
  loadingSeedLeaf: {
    width: 29,
    height: 22,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 17,
    backgroundColor: '#8CCB68',
    transform: [{ rotate: '-13deg' }],
  },
  loadingSeedStem: {
    width: 5,
    height: 17,
    marginTop: -3,
    borderRadius: 4,
    backgroundColor: '#69543a',
  },
  loadingTitle: {
    marginTop: 14,
    color: '#2a1c13',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  loadingCopy: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingTrack: {
    width: '100%',
    height: 7,
    marginTop: 18,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 138, 91, 0.18)',
  },
  loadingFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FF6628',
  },
  hiddenGrowImageWarmers: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenGrowImageWarmer: {
    width: 1,
    height: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#BBD4B8',
    width: '100%',
  },
  scene: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#BBD4B8',
    width: '100%',
  },
  groundBackground: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  forestTreeLayer: {
    zIndex: 1,
  },
  forestLeafLayer: {
    zIndex: 2,
  },
  nightSkySparkleLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '43%',
    zIndex: 2,
    overflow: 'visible',
  },
  nightSkySparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 246, 193, 0.42)',
  },
  nightSkySparkleVerticalRay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    marginLeft: -0.5,
    backgroundColor: 'rgba(255, 248, 209, 0.68)',
  },
  nightSkySparkleHorizontalRay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    height: 1,
    marginTop: -0.5,
    backgroundColor: 'rgba(255, 248, 209, 0.58)',
  },
  nightSkySparkleCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff8d0',
  },
  currentTreeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  currentTreeLayerStack: {
    position: 'relative',
    overflow: 'visible',
  },
  currentTreeBaseClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  currentTreeLeafClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  currentTreeLeafClipLeft: {
    transformOrigin: '85% 92%',
  },
  currentTreeLeafClipCenter: {
    transformOrigin: '50% 94%',
  },
  currentTreeLeafClipRight: {
    transformOrigin: '15% 92%',
  },
  currentTreeImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  roamingAnimalWrap: {
    position: 'absolute',
    left: 0,
    zIndex: 4,
  },
  roamingAnimalFacing: ROAMING_ANIMAL_FACING_FRAME,
  roamingAnimalPoseLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  roamingAnimalPoseVisible: {
    opacity: 1,
  },
  roamingAnimalPoseHidden: {
    opacity: 0,
  },
  roamingAnimalImage: {
    width: '100%',
    height: '100%',
  },
  growthSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 410,
    zIndex: 12,
  },
  pullTabHitArea: {
    position: 'absolute',
    top: -48,
    left: 0,
    right: 0,
    zIndex: 20,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  pullTabClip: {
    width: 86,
    height: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  pullTab: {
    width: 86,
    height: 43,
    borderTopLeftRadius: 43,
    borderTopRightRadius: 43,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 11,
    ...pullTabShadow,
  },
  pullTabArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  sheetContent: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    ...sheetContentShadow,
  },
  sheetBody: {
    position: 'relative',
    paddingHorizontal: 18,
    paddingTop: 39,
    paddingBottom: 88,
    gap: 9,
  },
  sheetDragZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 9,
  },
  sheetDragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(42, 28, 19, 0.32)',
  },
  seedProgressCard: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
    ...stageProgressCardShadow,
  },
  seedProgressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  seedProgressColumn: {
    minWidth: 0,
    flex: 1,
  },
  seedProgressColumnRight: {
    alignItems: 'flex-end',
  },
  seedProgressLabel: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  seedProgressValue: {
    marginTop: 3,
    color: '#2a1c13',
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
  },
  seedProgressPercent: {
    marginTop: 3,
    color: '#C7430E',
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
  },
  stageProgressTrack: {
    height: 8,
    marginTop: 11,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 138, 91, 0.18)',
  },
  stageProgressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FF6628',
  },
  verseCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 243, 214, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.14)',
  },
  verseTheme: {
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  verseExcerpt: {
    marginTop: 4,
    color: '#2a1c13',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  verseReference: {
    marginTop: 3,
    color: '#69543a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  sheetActionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetActionTile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 11,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.12)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...stageProgressCardShadow,
  },
  sheetActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0D7',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.14)',
  },
  sheetActionIconImage: {
    width: 43,
    height: 43,
  },
  sheetActionTilePressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: '#FFF6E6',
  },
  sheetActionCopy: {
    minWidth: 0,
    alignItems: 'center',
  },
  sheetActionTitle: {
    color: '#2a1c13',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  adminTreeControls: {
    gap: 7,
  },
  adminTreeToggle: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 102, 40, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminTreeTogglePressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: 'rgba(255, 102, 40, 0.18)',
  },
  adminTreeToggleText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  adminTreeToggleValue: {
    color: '#C7430E',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  adminTreeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adminTreeAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.12)',
  },
  adminTreeActionPrimary: {
    backgroundColor: '#FF6628',
    borderColor: '#FF6628',
  },
  adminTreeActionPressed: {
    opacity: 0.72,
  },
  adminTreeActionText: {
    color: '#513c25',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  adminTreeActionPrimaryText: {
    color: '#FFFFFF',
  },
  adminTreeError: {
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  overlayScreen: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  overlayHeader: {
    minHeight: 70,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 28, 19, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  overlayHeaderSpacer: {
    width: 44,
    height: 44,
  },
  overlayHeaderTitle: {
    flex: 1,
    color: '#2a1c13',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  overlayCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.14)',
  },
  overlayCloseText: {
    color: '#2a1c13',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  forestOverlayBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 34,
    alignItems: 'center',
  },
  forestOverlayHero: {
    width: 224,
    height: 224,
    borderRadius: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.92)',
    ...stageProgressCardShadow,
  },
  forestOverlayTree: {
    width: 190,
    height: 190,
  },
  overlayTitle: {
    marginTop: 22,
    color: '#2a1c13',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  overlayCopy: {
    maxWidth: 300,
    marginTop: 10,
    color: '#513c25',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  wheelContent: {
    minHeight: '100%',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 42,
  },
  wheelSlide: {
    minHeight: 470,
    justifyContent: 'center',
  },
  wheelCard: {
    minHeight: 430,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    ...stageProgressCardShadow,
  },
  wheelCardUnlocked: {
    backgroundColor: '#FFF8E8',
    borderColor: 'rgba(255, 102, 40, 0.18)',
  },
  wheelCardSelected: {
    borderColor: 'rgba(255, 102, 40, 0.38)',
  },
  wheelCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  wheelArtFrame: {
    width: 188,
    height: 206,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.86)',
    overflow: 'hidden',
  },
  wheelTreeImage: {
    width: 178,
    height: 178,
  },
  wheelStatus: {
    marginTop: 20,
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  wheelTitle: {
    marginTop: 7,
    color: '#2a1c13',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  wheelMeta: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  wheelHint: {
    maxWidth: 226,
    marginTop: 15,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  collectionWheelCard: {
    minHeight: 440,
  },
  mapWheelCard: {
    minHeight: 436,
  },
  mapReferenceCard: {
    minHeight: 452,
    borderRadius: 22,
    padding: 10,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.1)',
    ...stageProgressCardShadow,
  },
  mapReferenceCardCurrent: {
    backgroundColor: '#FFF8EA',
    borderColor: 'rgba(198, 95, 42, 0.38)',
  },
  mapReferenceCardLocked: {
    backgroundColor: '#F3EBDD',
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  mapReferenceArt: {
    height: 252,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF3D6',
  },
  mapReferenceImage: {
    width: '100%',
    height: '100%',
  },
  mapReferenceImageLocked: {
    opacity: 0.28,
    tintColor: '#1F1711',
  },
  mapReferenceLockedShade: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 28, 19, 0.18)',
  },
  mapReferenceLockedText: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    color: '#FFFDF8',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    backgroundColor: 'rgba(42, 28, 19, 0.62)',
    textTransform: 'uppercase',
  },
  mapReferenceBody: {
    paddingHorizontal: 8,
    paddingTop: 17,
    paddingBottom: 8,
  },
  mapReferenceKicker: {
    color: '#C65F2A',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mapReferenceKickerCurrent: {
    color: '#5F7F4D',
  },
  mapReferenceKickerLocked: {
    color: '#8B7B68',
  },
  mapReferenceTitle: {
    marginTop: 6,
    color: '#2a1c13',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  mapReferenceTitleLocked: {
    color: '#5D503F',
  },
  mapReferenceCopy: {
    marginTop: 7,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  mapReferenceSelectButton: {
    minHeight: 48,
    marginTop: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C65F2A',
    borderWidth: 1,
    borderColor: '#C65F2A',
  },
  mapReferenceSelectButtonCurrent: {
    backgroundColor: '#5F7F4D',
    borderColor: '#5F7F4D',
  },
  mapReferenceSelectButtonDisabled: {
    backgroundColor: 'rgba(245, 237, 224, 0.84)',
    borderColor: 'rgba(42, 28, 19, 0.07)',
  },
  mapReferenceSelectButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  mapReferenceSelectText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  mapReferenceSelectTextCurrent: {
    color: '#FFFFFF',
  },
  mapReferenceSelectTextDisabled: {
    color: '#8B7B68',
  },
  mapWheelIllustration: {
    width: 204,
    height: 218,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.86)',
    overflow: 'hidden',
  },
  mapWheelImage: {
    width: '100%',
    height: '100%',
  },
  mapWheelImageLocked: {
    opacity: 0.32,
    tintColor: '#1F1711',
  },
  mapWheelLockedShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 28, 19, 0.18)',
  },
  mapWheelCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(81, 60, 37, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  mapWheelPin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6628',
    ...pullTabShadow,
  },
  mapWheelLockedShape: {
    width: 118,
    height: 96,
    borderRadius: 42,
    backgroundColor: '#1F1711',
    opacity: 0.9,
  },
  mapOverlayBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    flexDirection: 'row',
    gap: 16,
  },
  mapPreviewCard: {
    flex: 1,
    minHeight: 292,
    alignSelf: 'flex-start',
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    overflow: 'hidden',
    ...stageProgressCardShadow,
  },
  mapPreviewEyebrow: {
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mapPreviewTitle: {
    marginTop: 7,
    color: '#2a1c13',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  mapPreviewCopy: {
    marginTop: 7,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  mapPathLine: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 72,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 102, 40, 0.2)',
  },
  mapSeedPin: {
    position: 'absolute',
    bottom: 44,
    left: '50%',
    width: 58,
    height: 58,
    marginLeft: -29,
    borderRadius: 29,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWheel: {
    width: 116,
    gap: 10,
    justifyContent: 'center',
  },
  mapWheelItem: {
    minHeight: 72,
    borderRadius: 24,
    paddingHorizontal: 13,
    paddingVertical: 11,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    opacity: 0.58,
  },
  mapWheelItemSelected: {
    minHeight: 92,
    backgroundColor: '#FF6628',
    borderColor: '#FF6628',
    opacity: 1,
    ...stageProgressCardShadow,
  },
  mapWheelTitle: {
    color: '#513c25',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  mapWheelTitleSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  mapWheelSubtitle: {
    marginTop: 4,
    color: '#69543a',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapWheelSubtitleSelected: {
    color: 'rgba(255, 255, 255, 0.86)',
  },
  forestDioramaScreen: {
    flex: 1,
    overflow: 'hidden',
  },
  forestDioramaBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  forestDioramaBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  forestDioramaBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
  },
  forestDioramaControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 30,
    flexDirection: 'row',
    gap: 10,
  },
  forestDioramaIconButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.12)',
    ...stageProgressCardShadow,
  },
  forestDioramaIconButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
  forestDioramaContent: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  forestDioramaLoading: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forestDioramaEyebrow: {
    color: '#C7430E',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  forestDioramaTitle: {
    marginTop: 5,
    color: '#2a1c13',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  forestDioramaCopy: {
    maxWidth: 318,
    marginTop: 8,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  forestDioramaStage: {
    width: '100%',
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  forestDioramaStageMotion: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  forestDioramaPlatform: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  forestDioramaPanLayer: {
    position: 'absolute',
    left: -34,
    right: -34,
    top: -72,
    bottom: -72,
  },
  forestDioramaBoardImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  forestDioramaThemeDeck: {
    paddingTop: 12,
    paddingBottom: 18,
  },
  forestDioramaThemeSlide: {
    minHeight: 336,
  },
  forestDioramaThemeCard: {
    minHeight: 322,
    borderRadius: 22,
    padding: 10,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.1)',
    ...stageProgressCardShadow,
  },
  forestDioramaThemeCardCurrent: {
    backgroundColor: '#FFF8EA',
    borderColor: 'rgba(198, 95, 42, 0.38)',
  },
  forestDioramaThemeCardLocked: {
    backgroundColor: '#F3EBDD',
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  forestDioramaThemeArt: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF3D6',
  },
  forestDioramaThemeImage: {
    width: '100%',
    height: '100%',
  },
  forestDioramaThemeImageLocked: {
    opacity: 0.28,
    tintColor: '#1F1711',
  },
  forestDioramaThemeLockedShade: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 28, 19, 0.18)',
  },
  forestDioramaThemeLockedText: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    color: '#FFFDF8',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    backgroundColor: 'rgba(42, 28, 19, 0.62)',
    textTransform: 'uppercase',
  },
  forestDioramaThemeBody: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  forestDioramaThemeKicker: {
    color: '#C65F2A',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  forestDioramaThemeKickerCurrent: {
    color: '#5F7F4D',
  },
  forestDioramaThemeKickerLocked: {
    color: '#8B7B68',
  },
  forestDioramaThemeTitle: {
    marginTop: 6,
    color: '#2a1c13',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
  },
  forestDioramaThemeTitleLocked: {
    color: '#5D503F',
  },
  forestDioramaThemeCopy: {
    marginTop: 7,
    minHeight: 36,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  forestDioramaThemeSelectButton: {
    minHeight: 46,
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C65F2A',
    borderWidth: 1,
    borderColor: '#C65F2A',
  },
  forestDioramaThemeSelectButtonCurrent: {
    backgroundColor: '#5F7F4D',
    borderColor: '#5F7F4D',
  },
  forestDioramaThemeSelectButtonDisabled: {
    backgroundColor: 'rgba(245, 237, 224, 0.84)',
    borderColor: 'rgba(42, 28, 19, 0.07)',
  },
  forestDioramaThemeSelectButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  forestDioramaThemeSelectText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  forestDioramaThemeSelectTextDisabled: {
    color: '#8B7B68',
  },
  forestDioramaSlot: {
    position: 'absolute',
    width: 82,
    height: 116,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  forestDioramaPlantShadow: {
    position: 'absolute',
    bottom: 8,
    width: 48,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 28, 19, 0.15)',
  },
  forestDioramaTree: {
    width: 98,
    height: 116,
    transformOrigin: '50% 100%',
  },
  forestDioramaTreePressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  forestDioramaTreeImage: {
    width: '100%',
    height: '100%',
  },
  forestDioramaEmptyPlant: {
    width: 24,
    height: 10,
    marginBottom: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(77, 111, 76, 0.12)',
  },
  forestDioramaList: {
    width: '100%',
    maxWidth: 372,
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  forestDioramaChip: {
    minHeight: 44,
    maxWidth: 168,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    paddingLeft: 7,
    paddingRight: 12,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
  },
  forestDioramaChipImageWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.9)',
  },
  forestDioramaChipImage: {
    width: 30,
    height: 30,
  },
  forestDioramaChipText: {
    flexShrink: 1,
    color: '#513c25',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  forestDioramaEmptyCard: {
    width: '100%',
    maxWidth: 330,
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  forestDioramaEmptyTitle: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  forestDioramaEmptyCopy: {
    marginTop: 6,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  collectionScreen: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  collectionScreenHeader: {
    minHeight: 78,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 28, 19, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
  },
  collectionHeaderTitleBlock: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  collectionHeaderButton: {
    minWidth: 54,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.12)',
  },
  collectionHeaderButtonPlaceholder: {
    width: 54,
    height: 44,
  },
  collectionHeaderButtonText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  collectionHeaderLogoFrame: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionHeaderLogoImage: {
    width: 94,
    height: 24,
  },
  collectionModalEyebrow: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  collectionModalTitle: {
    marginTop: 4,
    color: '#2a1c13',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  collectionModalClose: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.14)',
  },
  collectionModalCloseText: {
    color: '#2a1c13',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  collectionTabs: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 28, 19, 0.07)',
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
  },
  collectionTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.09)',
  },
  collectionTabActive: {
    backgroundColor: '#C65F2A',
    borderColor: '#C65F2A',
  },
  collectionTabText: {
    color: '#69543a',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  collectionTabTextActive: {
    color: '#FFFFFF',
  },
  collectionSlides: {
    flex: 1,
  },
  collectionDexGridContent: {
    paddingHorizontal: COLLECTION_DEX_GRID_HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COLLECTION_DEX_GRID_GAP,
  },
  collectionDexCard: {
    minHeight: 158,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.1)',
    shadowColor: '#2a1c13',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  collectionDexCardUnlocked: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(198, 95, 42, 0.22)',
  },
  collectionDexCardSelectedAnimal: {
    backgroundColor: '#FFF8EA',
    borderColor: 'rgba(95, 127, 77, 0.46)',
  },
  collectionDexCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  collectionDexHeader: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  collectionDexNumber: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    color: '#2a1c13',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    backgroundColor: '#8CCB68',
  },
  collectionDexNumberAnimal: {
    backgroundColor: '#FF8A5B',
  },
  collectionDexNumberLocked: {
    color: '#513c25',
    backgroundColor: '#D9D4C9',
  },
  collectionDexName: {
    minWidth: 0,
    flex: 1,
    color: '#513c25',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'lowercase',
  },
  collectionDexArt: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionDexImage: {
    width: 68,
    height: 68,
  },
  collectionDexAnimalImage: {
    width: 86,
    height: 86,
  },
  collectionDexLockedTreeImage: {
    width: 74,
    height: 74,
    opacity: 0.9,
  },
  collectionDexSilhouetteScale: {
    transform: [{ scale: 0.52 }],
  },
  collectionDexAnimalSilhouetteScale: {
    transform: [{ scale: 0.68 }],
  },
  collectionDexFooter: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  collectionDexFooterAnimal: {
    justifyContent: 'center',
  },
  collectionDexFooterText: {
    flexShrink: 1,
    color: '#C65F2A',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
  },
  collectionDexSelectButton: {
    minWidth: 76,
    minHeight: 26,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C65F2A',
    borderWidth: 1,
    borderColor: '#C65F2A',
  },
  collectionDexSelectButtonActive: {
    backgroundColor: '#5F7F4D',
    borderColor: '#5F7F4D',
  },
  collectionDexSelectButtonDisabled: {
    backgroundColor: '#E8DFD0',
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  collectionDexSelectButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  collectionDexSelectText: {
    color: '#FFFFFF',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
  },
  collectionDexSelectTextActive: {
    color: '#FFFFFF',
  },
  collectionDexSelectTextDisabled: {
    color: '#8B7B68',
  },
  collectionSlidesContent: {
    alignItems: 'stretch',
  },
  collectionSlide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 30,
  },
  collectionSlideCard: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...stageProgressCardShadow,
  },
  collectionSlideCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  collectionUnlockedArt: {
    width: 178,
    height: 178,
    borderRadius: 89,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.92)',
  },
  collectionUnlockedImage: {
    width: 160,
    height: 160,
  },
  collectionSilhouetteWrap: {
    width: 128,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionSilhouetteImage: {
    width: 118,
    height: 104,
    opacity: 0.94,
  },
  collectionSilhouetteAnimalImage: {
    width: 108,
    height: 98,
  },
  collectionSilhouetteBody: {
    backgroundColor: '#1F1711',
  },
  treeSilhouetteBody: {
    width: 98,
    height: 78,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 44,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 48,
  },
  treeSilhouetteTrunk: {
    width: 24,
    height: 34,
    marginTop: -9,
    borderRadius: 12,
    backgroundColor: '#1F1711',
  },
  animalSilhouetteBody: {
    width: 92,
    height: 78,
    borderRadius: 42,
  },
  animalSilhouetteEar: {
    position: 'absolute',
    top: 16,
    right: 22,
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#1F1711',
  },
  collectionSlideStatus: {
    marginTop: 18,
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  collectionSlideName: {
    marginTop: 6,
    color: '#2a1c13',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  collectionSlideMeta: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  collectionSlideHint: {
    maxWidth: 260,
    marginTop: 16,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  collectionDetailScroll: {
    flex: 1,
  },
  collectionDetailContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 38,
  },
  treeDetailHero: {
    alignSelf: 'center',
    width: 188,
    height: 188,
    borderRadius: 94,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 243, 214, 0.92)',
  },
  treeDetailHeroImage: {
    width: 170,
    height: 170,
  },
  treeDetailEyebrow: {
    marginTop: 20,
    color: '#C7430E',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  treeDetailTitle: {
    marginTop: 6,
    color: '#2a1c13',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  treeDetailCopy: {
    alignSelf: 'center',
    maxWidth: 304,
    marginTop: 8,
    color: '#513c25',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  treeDetailStatsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  treeDetailStat: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  treeDetailStatValue: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  treeDetailStatLabel: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  treeDetailSection: {
    marginTop: 16,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 13,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
  },
  treeDetailSectionTitle: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  treeDetailStageRow: {
    marginTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  treeDetailStageCell: {
    minHeight: 78,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 243, 214, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
  },
  treeDetailStageCellActive: {
    borderColor: '#FF6628',
    backgroundColor: 'rgba(255, 102, 40, 0.11)',
  },
  treeDetailStageCellPressed: {
    transform: [{ scale: 0.97 }],
  },
  treeDetailStageImage: {
    width: 36,
    height: 36,
  },
  treeDetailStageSpecies: {
    width: '100%',
    marginTop: 5,
    color: '#513c25',
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  treeDetailStageLabel: {
    marginTop: 2,
    color: '#69543a',
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '900',
  },
  treeDetailVerseCard: {
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: 'rgba(255, 243, 214, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.15)',
  },
});
