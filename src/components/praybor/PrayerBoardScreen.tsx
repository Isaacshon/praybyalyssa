import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  Image,
  Modal,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAsset } from '@/components/praybor/AnimatedAsset';
import { OnboardingModal } from '@/components/praybor/OnboardingModal';
import { PrayerComposerSheet } from '@/components/praybor/PrayerComposerSheet';
import {
  getPostItLayerEdgeColor,
  getPostItFoldShade,
  MoodFace,
  PostItCornerFold,
  PrayerCardArt,
  ReactionIcon,
  UtilityIcon,
} from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import {
  MOODS,
  setPrayerReaction,
  type PrayerDraft,
  type PrayerReaction,
  type PrayerVisibility,
  type ReactionType,
} from '@/lib/praybor/domain';
import {
  groupPrayerCards,
  initialReactions,
  publicPrayerCards,
  type PrayerCard,
} from '@/lib/praybor/sample-data';
import { getPostItPinImage, getPostItPinImageForKey } from '@/components/praybor/postItPins';

type PrayerBoardScreenProps = {
  scope: PrayerVisibility;
  onBack?: () => void;
};

const reactionLabels: { type: ReactionType; label: string }[] = [
  { type: 'prayer', label: 'Prayer' },
  { type: 'amen', label: 'Amen' },
  { type: 'comfort', label: 'Comfort' },
  { type: 'love', label: 'Love' },
];

const prayerCardShadow = Platform.select({
  web: { boxShadow: '0 8px 20px rgba(255, 138, 91, 0.12)' },
  default: {
    shadowColor: '#FF8A5B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});

const composerPillShadow = Platform.select({
  web: { boxShadow: '0 14px 26px rgba(255, 138, 91, 0.18)' },
  default: {
    shadowColor: '#FF8A5B',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
});

const cardBackgrounds = ['#FFFFFF', '#FFE7A8', '#FFD8D4', '#E7F3DD', '#DDEDF5'];
const largePostItBackgrounds = [
  '#FFF1CC',
  '#F6A5C4',
  '#B78BDD',
  '#FF666A',
  '#A7EAB2',
  '#F2D566',
  '#BEE8F7',
  '#FDB26A',
];
const MIN_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;

const postItLayerShadow = Platform.select({
  web: { boxShadow: '0 18px 24px rgba(10, 6, 0, 0.10)' },
  default: {
    shadowColor: '#0A0600',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
});

const webDragSurfaceStyle =
  Platform.OS === 'web'
    ? ({
        cursor: 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
      } as unknown as ViewStyle)
    : undefined;

export function PrayerBoardScreen({ onBack, scope }: PrayerBoardScreenProps) {
  const colors = Colors.light;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const viewportWidth = width > 0 ? width : 390;
  const [composerVisible, setComposerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [radiusKm, setRadiusKm] = useState(MIN_RADIUS_KM);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reactions, setReactions] = useState<PrayerReaction[]>(initialReactions);
  const [localCards, setLocalCards] = useState<PrayerCard[]>([]);
  const baseCards = scope === 'public' ? publicPrayerCards : groupPrayerCards;
  const usePostItPager = scope === 'public';
  const columns = usePostItPager ? 1 : viewportWidth >= 360 ? 2 : 1;

  const cards = useMemo(() => [...localCards, ...baseCards], [baseCards, localCards]);
  const title = scope === 'public' ? 'Neighborhood prayers' : 'Friday House Church';
  const subtitle =
    scope === 'public'
      ? `${radiusKm} km - ${cards.length} prayers`
      : 'Private group - 3 prayers';

  function createLocalCard(draft: PrayerDraft) {
    setLocalCards((current) => [
      {
        id: `local-${Date.now()}`,
        title: draft.title,
        body: draft.body,
        mood: draft.mood,
        visibility: draft.visibility,
        identity: draft.identity,
        authorLabel: draft.identity === 'anonymous' ? 'A neighbor' : 'You',
        neighborhood: draft.visibility === 'public' ? 'Midtown' : undefined,
        groupName: draft.visibility === 'group' ? 'Friday House Church' : undefined,
        postedAgo: 'now',
        paperColor: draft.paperColor,
        pinSeed: draft.pinSeed,
      },
      ...current,
    ]);
  }

  function reactToPrayer(prayerId: string, type: ReactionType) {
    setReactions((current) =>
      setPrayerReaction(current, {
        prayerId,
        userId: 'current-user',
        type,
      }),
    );
  }

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={handleBack} style={styles.headerIcon}>
            <UtilityIcon type="back" size={23} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open board settings"
            onPress={() => setSettingsVisible(true)}
            style={styles.headerIcon}>
            <UtilityIcon type="sliders" size={23} />
          </Pressable>
        </View>

        {usePostItPager ? (
          <PrayerPostItPager
            cards={cards}
            reactions={reactions}
            viewportWidth={viewportWidth}
            onReact={reactToPrayer}
          />
        ) : (
          <View style={[styles.boardGrid, { gap: columns === 2 ? 8 : 12 }]}>
            {cards.map((card, index) => (
              <React.Fragment key={card.id}>
                <PrayerCardView
                  card={card}
                  index={index}
                  reactions={reactions.filter((reaction) => reaction.prayerId === card.id)}
                  onReact={(type) => reactToPrayer(card.id, type)}
                  compact={columns === 2}
                  widthStyle={columns === 2 ? styles.cardHalf : styles.cardFull}
                />
                {columns === 2 && index === 1 ? <PrayerSignalStrip /> : null}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.composerBar,
          {
            left: 0,
            width: Math.min(viewportWidth, 390),
          },
        ]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Reorder prayer board" style={styles.shuffleButton}>
          <UtilityIcon type="shuffle" size={25} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write a new prayer request"
          onPress={() => setComposerVisible(true)}
          style={styles.plusButton}>
          <UtilityIcon type="plus" size={25} color="#FFFFFF" />
        </Pressable>
      </View>

      <PrayerComposerSheet
        visible={composerVisible}
        defaultVisibility={scope}
        onClose={() => setComposerVisible(false)}
        onCreate={createLocalCard}
      />

      <BoardSettingsModal
        radiusKm={radiusKm}
        visible={settingsVisible}
        onChangeRadius={setRadiusKm}
        onClose={() => setSettingsVisible(false)}
      />

      {scope === 'public' ? (
        <OnboardingModal visible={showOnboarding} onClose={() => setShowOnboarding(false)} />
      ) : null}
    </SafeAreaView>
  );
}

function PrayerPostItPager({
  cards,
  onReact,
  reactions,
  viewportWidth,
}: {
  cards: PrayerCard[];
  onReact: (prayerId: string, type: ReactionType) => void;
  reactions: PrayerReaction[];
  viewportWidth: number;
}) {
  const colors = Colors.light;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentOffsetX = useRef(0);
  const dragStartOffsetX = useRef(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageWidth = Math.max(viewportWidth - 36, 284);
  const maxScrollX = Math.max(0, (cards.length - 1) * pageWidth);

  const clampScrollOffset = (offset: number) => Math.max(0, Math.min(maxScrollX, offset));

  function scrollToPage(page: number, animated = true) {
    const nextPage = Math.max(0, Math.min(cards.length - 1, page));
    const nextOffset = nextPage * pageWidth;

    currentOffsetX.current = nextOffset;
    scrollX.setValue(nextOffset);
    setCurrentPage(nextPage);
    scrollViewRef.current?.scrollTo({ x: nextOffset, animated });
  }

  const dragResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) > 8 &&
      Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
    onPanResponderGrant: () => {
      dragStartOffsetX.current = currentOffsetX.current;
    },
    onPanResponderMove: (_, gestureState) => {
      const nextOffset = clampScrollOffset(dragStartOffsetX.current - gestureState.dx);

      currentOffsetX.current = nextOffset;
      scrollX.setValue(nextOffset);
      scrollViewRef.current?.scrollTo({ x: nextOffset, animated: false });
    },
    onPanResponderRelease: (_, gestureState) => {
      const projectedOffset = clampScrollOffset(currentOffsetX.current - gestureState.vx * 160);
      scrollToPage(Math.round(projectedOffset / pageWidth));
    },
    onPanResponderTerminate: () => {
      scrollToPage(Math.round(currentOffsetX.current / pageWidth));
    },
  });

  function updateCurrentPage(event: NativeSyntheticEvent<NativeScrollEvent>) {
    currentOffsetX.current = event.nativeEvent.contentOffset.x;

    const nextPage = Math.round(currentOffsetX.current / pageWidth);
    setCurrentPage(Math.max(0, Math.min(cards.length - 1, nextPage)));
  }

  return (
    <View style={styles.postItPager}>
      <View style={[styles.postItDragSurface, webDragSurfaceStyle]} {...dragResponder.panHandlers}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          snapToInterval={pageWidth}
          scrollEventThrottle={16}
          onMomentumScrollEnd={updateCurrentPage}
          onScrollEndDrag={updateCurrentPage}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: false,
              listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                currentOffsetX.current = event.nativeEvent.contentOffset.x;
              },
            },
          )}>
          {cards.map((card, index) => {
            const inputRange = [
              (index - 1) * pageWidth,
              index * pageWidth,
              (index + 1) * pageWidth,
            ];
            const rotate = scrollX.interpolate({
              inputRange,
              outputRange: ['7deg', index % 2 === 0 ? '-1.6deg' : '1.4deg', '-7deg'],
              extrapolate: 'clamp',
            });
            const rotateY = scrollX.interpolate({
              inputRange,
              outputRange: ['18deg', '0deg', '-18deg'],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.88, 1, 0.88],
              extrapolate: 'clamp',
            });
            const translateX = scrollX.interpolate({
              inputRange,
              outputRange: [26, 0, -26],
              extrapolate: 'clamp',
            });
            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [34, 0, 34],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1, 0.72],
              extrapolate: 'clamp',
            });
            const cardReactions = reactions.filter((reaction) => reaction.prayerId === card.id);
            const previousCard = cards[(index + 1) % cards.length] ?? card;
            const nextCard = cards[(index + 2) % cards.length] ?? card;
            const previousPaperColor =
              previousCard.paperColor ??
              largePostItBackgrounds[(index + 1) % largePostItBackgrounds.length];
            const nextPaperColor =
              nextCard.paperColor ??
              largePostItBackgrounds[(index + 2) % largePostItBackgrounds.length];
            const noteWidth = Math.min(pageWidth - 10, 344);
            const noteOffsetX = 0;
            const noteLeft = (pageWidth - noteWidth) / 2 + noteOffsetX;
            const pinImage =
              typeof card.pinSeed === 'number'
                ? getPostItPinImage(card.pinSeed)
                : getPostItPinImageForKey(card.id);

            return (
              <View key={card.id} style={[styles.postItPage, { width: pageWidth }]}>
                <Animated.View
                  style={[
                    styles.postItAnimatedShell,
                    {
                      width: pageWidth,
                      opacity,
                      transform: [
                        { perspective: 900 },
                        { translateX },
                        { translateY },
                        { rotateY },
                        { rotate },
                        { scale },
                      ],
                    },
                  ]}>
                  <View
                    style={[
                      styles.postItBackSheet,
                      styles.postItBackSheetFar,
                      {
                        left: noteLeft - 18,
                        width: noteWidth + 26,
                        backgroundColor: nextPaperColor,
                        borderColor: getPostItLayerEdgeColor(nextPaperColor, 0.38),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.postItBackSheet,
                      styles.postItBackSheetNear,
                      {
                        left: noteLeft - 8,
                        width: noteWidth + 10,
                        backgroundColor: previousPaperColor,
                        borderColor: getPostItLayerEdgeColor(previousPaperColor, 0.42),
                      },
                    ]}
                  />
                  <PostItPrayerCard
                    card={card}
                    index={index}
                    noteOffsetX={noteOffsetX}
                    noteWidth={noteWidth}
                    pinImage={pinImage}
                    reactions={cardReactions}
                    total={cards.length}
                    onReact={(type) => onReact(card.id, type)}
                  />
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>

      <View style={styles.postItDots}>
        {cards.map((card, index) => (
          <View
            key={`${card.id}-dot`}
            style={[
              styles.postItDot,
              {
                backgroundColor: index === currentPage ? colors.text : colors.backgroundSelected,
                width: index === currentPage ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function BoardSettingsModal({
  onChangeRadius,
  onClose,
  radiusKm,
  visible,
}: {
  onChangeRadius: (radiusKm: number) => void;
  onClose: () => void;
  radiusKm: number;
  visible: boolean;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.settingsOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close board settings"
          onPress={onClose}
          style={styles.settingsScrim}
        />
        <SafeAreaView pointerEvents="box-none" style={styles.settingsSafe}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHandle} />
            <View style={styles.settingsHeader}>
              <View>
                <Text style={styles.settingsTitle}>Board settings</Text>
                <Text style={styles.settingsSubtitle}>Choose how far neighborhood prayers can come from.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close board settings"
                onPress={onClose}
                style={styles.settingsClose}>
                <UtilityIcon type="close" size={21} />
              </Pressable>
            </View>

            <RadiusSlider value={radiusKm} onChange={onChangeRadius} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function RadiusSlider({
  onChange,
  value,
}: {
  onChange: (radiusKm: number) => void;
  value: number;
}) {
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const trackContainerRef = useRef<View>(null);
  const clampedValue = Number.isFinite(value)
    ? Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, value))
    : MIN_RADIUS_KM;
  const progress =
    (clampedValue - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM);

  function commitRadiusFromLocation(x: number) {
    const width = trackWidthRef.current;

    if (!width || !Number.isFinite(x)) {
      return;
    }

    const boundedX = Math.max(0, Math.min(width, x));
    const nextProgress = boundedX / width;
    const nextValue = Math.round(MIN_RADIUS_KM + nextProgress * (MAX_RADIUS_KM - MIN_RADIUS_KM));
    onChange(nextValue);
  }

  function commitRadiusFromEvent(event: GestureResponderEvent) {
    const { locationX, pageX } = event.nativeEvent;
    const relativeX = Number.isFinite(locationX)
      ? locationX
      : Number.isFinite(pageX)
        ? pageX - trackPageXRef.current
        : NaN;

    commitRadiusFromLocation(relativeX);
  }

  const radiusResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        commitRadiusFromEvent(event);
      },
      onPanResponderMove: (event) => {
        commitRadiusFromEvent(event);
      },
    }),
  ).current;

  function handleTrackLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;

    trackWidthRef.current = width;
    requestAnimationFrame(() => {
      trackContainerRef.current?.measureInWindow((x) => {
        trackPageXRef.current = x;
      });
    });
  }

  function handleTrackPress(event: GestureResponderEvent) {
    commitRadiusFromEvent(event);
  }

  return (
    <View style={styles.radiusControl}>
      <View style={styles.radiusTopRow}>
        <Text style={styles.radiusLabel}>Distance radius</Text>
        <Text style={styles.radiusValue}>{clampedValue} km</Text>
      </View>
      <View
        ref={trackContainerRef}
        onLayout={handleTrackLayout}
        style={styles.radiusTrackMeasure}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`Distance radius, ${clampedValue} kilometers`}
          accessibilityValue={{ min: MIN_RADIUS_KM, max: MAX_RADIUS_KM, now: clampedValue }}
          onPress={handleTrackPress}
          style={styles.radiusTrackTouch}
          {...radiusResponder.panHandlers}>
          <View style={styles.radiusTrack}>
            <View style={[styles.radiusTrackFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.radiusThumb, { left: `${progress * 100}%` }]} />
          </View>
        </Pressable>
      </View>
      <View style={styles.radiusRangeRow}>
        <Text style={styles.radiusRangeText}>{MIN_RADIUS_KM} km</Text>
        <Text style={styles.radiusRangeText}>{MAX_RADIUS_KM} km</Text>
      </View>
    </View>
  );
}

function PostItPrayerCard({
  card,
  index,
  noteOffsetX,
  noteWidth,
  onReact,
  pinImage,
  reactions,
  total,
}: {
  card: PrayerCard;
  index: number;
  noteOffsetX: number;
  noteWidth: number;
  onReact: (type: ReactionType) => void;
  pinImage: ImageSourcePropType;
  reactions: PrayerReaction[];
  total: number;
}) {
  const colors = Colors.light;
  const mood = MOODS.find((option) => option.id === card.mood) ?? MOODS[0];
  const [revealed, setRevealed] = useState(!card.isSensitive);
  const paperColor = card.paperColor ?? largePostItBackgrounds[index % largePostItBackgrounds.length];
  const foldShade = getPostItFoldShade(paperColor);
  const foldSide = index % 2 === 0 ? 'right' : 'left';

  return (
    <View
      accessible
      accessibilityLabel={`${mood.label} prayer note. ${card.title}`}
      style={[styles.postItStackFrame, { transform: [{ translateX: noteOffsetX }], width: noteWidth }]}>
      <View pointerEvents="none" style={styles.postItPinWrap}>
        <View
          style={[
            styles.postItPinImageShell,
            index % 2 === 0 ? styles.postItPinTiltLeft : styles.postItPinTiltRight,
          ]}>
          <Image source={pinImage} resizeMode="contain" style={styles.postItPinImage} />
        </View>
      </View>

      <View
        style={[
          styles.postItNote,
          {
            backgroundColor: paperColor,
            borderColor: getPostItLayerEdgeColor(paperColor, 0.24),
            width: noteWidth,
          },
        ]}>
        <View pointerEvents="none" style={styles.postItPaperGrain} />
        <View pointerEvents="none" style={styles.postItAdhesiveBand} />
        <View pointerEvents="none" style={styles.postItSurfaceWash} />
        <View pointerEvents="none" style={styles.postItPaperFiberTop} />
        <View pointerEvents="none" style={styles.postItTopCrease} />
        <View pointerEvents="none" style={styles.postItLeftLift} />
        <View pointerEvents="none" style={styles.postItEdgeShade} />
        <View pointerEvents="none" style={styles.postItPaperFiberBottom} />
        <View pointerEvents="none" style={styles.postItLowerLift} />
        <View pointerEvents="none" style={styles.postItUnderCurl} />
        <View pointerEvents="none" style={styles.postItBottomShade} />
        <View
          pointerEvents="none"
          style={[
            styles.postItFoldShadow,
            { backgroundColor: foldShade },
            foldSide === 'right' ? styles.postItFoldShadowRight : styles.postItFoldShadowLeft,
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.postItFold,
            foldSide === 'right' ? styles.postItFoldRight : styles.postItFoldLeft,
          ]}>
          <PostItCornerFold color={paperColor} side={foldSide} size={68} />
        </View>
        <View style={styles.postItContentLayer}>
          <View style={styles.postItTopRow}>
            <View style={styles.postItMoodRow}>
              <MoodFace mood={card.mood} size={40} />
              <View style={styles.postItMoodText}>
                <Text style={[styles.postItMoodLabel, { color: colors.text }]}>{mood.label}</Text>
                <Text style={[styles.postItMeta, { color: colors.textSecondary }]}>{card.postedAgo}</Text>
              </View>
            </View>
            <Text style={[styles.postItCount, { color: colors.textSecondary }]}>
              {index + 1}/{total}
            </Text>
          </View>

          <Text style={[styles.postItTitle, { color: colors.text }]} numberOfLines={2}>
            {card.title}
          </Text>

          {revealed ? (
            <Text style={[styles.postItBody, { color: colors.textSecondary }]} numberOfLines={3}>
              {card.body}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sensitive prayer. Tap to reveal."
              onPress={() => setRevealed(true)}
              style={[styles.postItSensitiveBox, { backgroundColor: 'rgba(255, 255, 255, 0.44)' }]}>
              <Text style={[styles.postItSensitiveText, { color: colors.text }]}>
                Sensitive prayer. Tap to read with care.
              </Text>
            </Pressable>
          )}

          <View style={styles.postItArtRow}>
            <PrayerCardArt mood={card.mood} variant={index} size={52} />
          </View>

          <Text numberOfLines={1} style={[styles.postItAuthor, { color: colors.textSecondary }]}>
            {card.authorLabel} - {card.groupName ?? card.neighborhood}
          </Text>

          <View style={styles.postItReactionRow}>
            {reactionLabels.map((reaction) => {
              const count = reactions.filter((item) => item.type === reaction.type).length;

              return (
                <Pressable
                  key={reaction.type}
                  accessibilityRole="button"
                  accessibilityLabel={`${reaction.label} reaction, ${count} selected`}
                  onPress={() => onReact(reaction.type)}
                  style={styles.postItReactionButton}>
                  {reaction.type === 'prayer' || reaction.type === 'love' ? (
                    <AnimatedAsset assetKey={`reaction_${reaction.type}`} size={19} />
                  ) : (
                    <ReactionIcon type={reaction.type} size={18} />
                  )}
                  <Text style={[styles.postItReactionCount, { color: colors.text }]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function PrayerCardView({
  card,
  index,
  compact,
  reactions,
  onReact,
  widthStyle,
}: {
  card: PrayerCard;
  index: number;
  compact: boolean;
  reactions: PrayerReaction[];
  onReact: (type: ReactionType) => void;
  widthStyle: StyleProp<ViewStyle>;
}) {
  const colors = Colors.light;
  const mood = MOODS.find((option) => option.id === card.mood) ?? MOODS[0];
  const [revealed, setRevealed] = useState(!card.isSensitive);

  return (
    <View
      accessible
      accessibilityLabel={`${mood.label} prayer card. ${card.title}`}
      style={[
        styles.prayerCard,
        widthStyle,
        {
          backgroundColor: card.isSensitive && !revealed
            ? colors.backgroundSelected
            : card.paperColor ?? cardBackgrounds[index % cardBackgrounds.length],
          borderColor: 'rgba(32, 36, 31, 0.04)',
        },
        compact && styles.prayerCardCompact,
      ]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.moodPill, { backgroundColor: `${mood.color}2B` }]}>
          <MoodFace mood={mood.id} size={30} />
          {!compact ? <Text style={[styles.moodChip, { color: colors.text }]}>{mood.label}</Text> : null}
        </View>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{card.postedAgo}</Text>
      </View>
      <Text
        numberOfLines={compact ? 2 : 3}
        style={[styles.cardTitle, compact && styles.cardTitleCompact, { color: colors.text }]}>
        {card.title}
      </Text>
      {revealed ? (
        <Text
          numberOfLines={compact ? 2 : 4}
          style={[styles.cardBody, compact && styles.cardBodyCompact, { color: colors.textSecondary }]}>
          {card.body}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sensitive prayer. Tap to reveal."
          onPress={() => setRevealed(true)}
          style={[styles.sensitiveBox, { backgroundColor: colors.softGreen }]}>
          <Text style={[styles.sensitiveText, { color: colors.text }]}>
            Sensitive prayer. Tap to read with care.
          </Text>
        </Pressable>
      )}
      <View style={styles.cardArtRow}>
        <PrayerCardArt mood={mood.id} variant={index} size={compact ? 44 : 68} />
      </View>
      {!compact ? (
        <Text numberOfLines={1} style={[styles.author, { color: colors.textSecondary }]}>
          {card.authorLabel} - {card.groupName ?? card.neighborhood}
        </Text>
      ) : null}
      <View style={[styles.reactionRow, compact && styles.reactionRowCompact]}>
        {reactionLabels.map((reaction) => {
          const count = reactions.filter((item) => item.type === reaction.type).length;
          return (
            <Pressable
              key={reaction.type}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.label} reaction, ${count} selected`}
              onPress={() => onReact(reaction.type)}
              style={[styles.reactionButton, compact && styles.reactionButtonCompact, { backgroundColor: colors.softBlue }]}>
              {reaction.type === 'prayer' || reaction.type === 'love' ? (
                <AnimatedAsset assetKey={`reaction_${reaction.type}`} size={compact ? 14 : 26} />
              ) : (
                <ReactionIcon type={reaction.type} size={compact ? 13 : 25} />
              )}
              <Text style={[styles.reactionCount, compact && styles.reactionCountCompact, { color: colors.text }]}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PrayerSignalStrip() {
  return (
    <View style={[styles.signalStrip, prayerCardShadow]}>
      <View style={styles.signalAvatars}>
        <View style={[styles.signalAvatar, { backgroundColor: '#FF8A5B' }]} />
        <View style={[styles.signalAvatar, { backgroundColor: '#FFD2C0', marginTop: -2 }]} />
      </View>
      <View style={styles.waveStack}>
        <SignalWave tint="#FFE0D2" activeTint="#0A0600" />
        <SignalWave tint="#FFE1D5" activeTint="#FF8A5B" short />
      </View>
      <Text style={styles.signalTime}>01:09</Text>
    </View>
  );
}

function SignalWave({
  activeTint,
  short,
  tint,
}: {
  activeTint: string;
  short?: boolean;
  tint: string;
}) {
  const bars = short ? [12, 8, 16, 10, 18, 9, 14, 7, 12, 6] : [8, 14, 20, 10, 18, 24, 12, 16, 22, 10, 19, 8];

  return (
    <View style={styles.waveRow}>
      {bars.map((height, index) => (
        <View
          key={`${height}-${index}`}
          style={[
            styles.waveBar,
            {
              height,
              backgroundColor: index < 4 ? activeTint : tint,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.select({ web: 172, default: 104 }),
  },
  header: {
    minHeight: 58,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  postItPager: {
    marginTop: 0,
    width: '100%',
    alignItems: 'center',
  },
  postItDragSurface: {
    width: '100%',
  },
  postItPage: {
    paddingTop: 22,
    paddingBottom: 28,
    alignItems: 'center',
  },
  postItAnimatedShell: {
    paddingTop: 22,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  postItBackSheet: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...postItLayerShadow,
  },
  postItBackSheetFar: {
    top: 70,
    height: 92,
    opacity: 0.34,
    transform: [{ rotate: '-4.4deg' }],
  },
  postItBackSheetNear: {
    top: 76,
    height: 76,
    opacity: 0.54,
    transform: [{ rotate: '4.8deg' }],
  },
  postItStackFrame: {
    position: 'relative',
    alignItems: 'center',
  },
  postItPinWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    height: 70,
    alignItems: 'center',
  },
  postItPinImageShell: {
    width: 64,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postItPinImage: {
    width: 94,
    height: 94,
  },
  postItPinTiltLeft: {
    transform: [{ rotate: '-7deg' }],
  },
  postItPinTiltRight: {
    transform: [{ rotate: '6deg' }],
  },
  postItNote: {
    aspectRatio: 720 / 1040,
    marginTop: 34,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'visible',
    zIndex: 2,
    ...postItLayerShadow,
  },
  postItContentLayer: {
    position: 'absolute',
    top: '18%',
    right: '10.5%',
    bottom: '11%',
    left: '12.5%',
    zIndex: 2,
  },
  postItPaperGrain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  postItAdhesiveBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    backgroundColor: 'rgba(10, 6, 0, 0.055)',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  postItSurfaceWash: {
    position: 'absolute',
    top: 70,
    left: 18,
    right: 16,
    bottom: 58,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    opacity: 0.78,
    transform: [{ rotate: '-2deg' }],
  },
  postItPaperFiberTop: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 9,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    opacity: 0.86,
  },
  postItPaperFiberBottom: {
    position: 'absolute',
    left: 24,
    right: 38,
    bottom: 25,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 6, 0, 0.065)',
    opacity: 0.34,
    transform: [{ rotate: '-1.2deg' }],
  },
  postItTopCrease: {
    position: 'absolute',
    top: 51,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(10, 6, 0, 0.055)',
  },
  postItEdgeShade: {
    position: 'absolute',
    top: 50,
    right: 0,
    bottom: 16,
    width: 30,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(10, 6, 0, 0.045)',
  },
  postItLeftLift: {
    position: 'absolute',
    top: 56,
    left: 0,
    bottom: 26,
    width: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  postItLowerLift: {
    position: 'absolute',
    left: 20,
    right: 28,
    bottom: -5,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 6, 0, 0.12)',
    opacity: 0.22,
    transform: [{ scaleY: 0.34 }, { rotate: '-1.2deg' }],
  },
  postItUnderCurl: {
    position: 'absolute',
    left: 38,
    right: 10,
    bottom: -12,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 6, 0, 0.16)',
    opacity: 0.22,
    transform: [{ scaleY: 0.28 }, { rotate: '-1.5deg' }],
  },
  postItBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: 'rgba(10, 6, 0, 0.046)',
  },
  postItFoldShadow: {
    position: 'absolute',
    bottom: 14,
    width: 42,
    height: 42,
    backgroundColor: 'rgba(10, 6, 0, 0.16)',
    opacity: 0.17,
    transform: [{ skewX: '-12deg' }],
  },
  postItFold: {
    position: 'absolute',
    bottom: 0,
    width: 68,
    height: 68,
    zIndex: 1,
  },
  postItFoldRight: {
    right: 0,
  },
  postItFoldLeft: {
    left: 0,
  },
  postItFoldShadowRight: {
    right: 2,
  },
  postItFoldShadowLeft: {
    left: 2,
    transform: [{ skewX: '12deg' }],
  },
  postItTopRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  postItMoodRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  postItMoodText: {
    minWidth: 0,
  },
  postItMoodLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  postItMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  postItCount: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  postItTitle: {
    marginTop: 14,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
  },
  postItBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  postItSensitiveBox: {
    minHeight: 104,
    marginTop: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  postItSensitiveText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
  },
  postItArtRow: {
    minHeight: 56,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postItAuthor: {
    marginTop: 0,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  postItReactionRow: {
    marginTop: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  postItReactionButton: {
    minHeight: 36,
    minWidth: 53,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  postItReactionCount: {
    fontSize: 12,
    fontWeight: '900',
  },
  postItDots: {
    marginTop: 6,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  postItDot: {
    height: 8,
    borderRadius: 4,
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardFull: {
    width: '100%',
  },
  cardHalf: {
    width: '48.5%',
  },
  prayerCard: {
    minHeight: 206,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    ...prayerCardShadow,
  },
  prayerCardCompact: {
    minHeight: 170,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    overflow: 'hidden',
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 10,
  },
  moodChip: {
    fontWeight: '900',
    fontSize: 13,
  },
  cardMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  cardTitleCompact: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 18,
  },
  cardBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  cardBodyCompact: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  sensitiveBox: {
    marginTop: 12,
    minHeight: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  sensitiveText: {
    textAlign: 'center',
    fontWeight: '800',
  },
  author: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
  },
  authorCompact: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 14,
  },
  cardArtRow: {
    marginTop: 2,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  reactionRowCompact: {
    gap: 4,
    marginTop: 5,
  },
  reactionButton: {
    minHeight: 44,
    minWidth: 62,
    borderRadius: 18,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  reactionButtonCompact: {
    minHeight: 26,
    minWidth: 30,
    borderRadius: 10,
    paddingHorizontal: 3,
    gap: 2,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '900',
  },
  reactionCountCompact: {
    fontSize: 10,
  },
  signalStrip: {
    width: '100%',
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFF8F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalAvatars: {
    width: 22,
    alignItems: 'center',
    gap: 2,
  },
  signalAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  waveStack: {
    flex: 1,
    gap: 5,
  },
  waveRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  signalTime: {
    color: '#736C67',
    fontSize: 10,
    fontWeight: '800',
  },
  composerBar: {
    position: 'absolute',
    bottom: Platform.select({ web: 86, default: 0 }),
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  plusButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    ...composerPillShadow,
  },
  shuffleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 0, 0.32)',
  },
  settingsScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  settingsSafe: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    marginHorizontal: 14,
    marginBottom: Platform.select({ web: 92, default: 18 }),
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    ...composerPillShadow,
  },
  settingsHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8DED7',
    marginBottom: 14,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingsTitle: {
    color: '#0A0600',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  settingsSubtitle: {
    maxWidth: 250,
    marginTop: 4,
    color: '#736C67',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  settingsClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusControl: {
    marginTop: 22,
  },
  radiusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  radiusLabel: {
    color: '#0A0600',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  radiusValue: {
    color: '#FF6628',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  radiusTrackMeasure: {
    marginTop: 16,
  },
  radiusTrackTouch: {
    minHeight: 44,
    justifyContent: 'center',
  },
  radiusTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#FFE2D4',
    overflow: 'visible',
  },
  radiusTrackFill: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#FF6628',
  },
  radiusThumb: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 32,
    marginLeft: -16,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FF8A5B',
    ...composerPillShadow,
  },
  radiusRangeRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusRangeText: {
    color: '#736C67',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
});
