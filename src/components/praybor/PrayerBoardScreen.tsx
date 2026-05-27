import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { BlessiLogo } from '@/components/praybor/BlessiLogo';
import { getMaskingTapeTheme, MaskingTapeSurface } from '@/components/praybor/MaskingTapeSurface';
import { OnboardingModal } from '@/components/praybor/OnboardingModal';
import { PrayerComposerSheet } from '@/components/praybor/PrayerComposerSheet';
import { PrayerReportModal } from '@/components/praybor/PrayerReportModal';
import {
  getPostItLayerEdgeColor,
  getPostItFoldShade,
  MoodFace,
  PostItCornerFold,
  UtilityIcon,
} from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import {
  maskProfanityInText,
  submitPrayerReport,
  type PrayerReportReason,
} from '@/lib/praybor/content-safety';
import {
  MOODS,
  setPrayerReaction,
  type PrayerDraft,
  type PrayerReaction,
  type PrayerVisibility,
  type ReactionType,
} from '@/lib/praybor/domain';
import {
  dismissPublicBoardWelcome,
  hasDismissedPublicBoardWelcome,
} from '@/lib/praybor/first-run-welcome';
import { recordTreeGrowthAction } from '@/lib/praybor/growth-state';
import {
  openPrayerLocationSettings,
  requestPrayerLocation,
  type PrayerLocation,
  type PrayerLocationResult,
} from '@/lib/praybor/location';
import {
  publicPrayerCards,
  type PrayerCard,
} from '@/lib/praybor/sample-data';
import {
  createPersistedPrayerCard,
  fetchPersistedPrayerCards,
} from '@/lib/praybor/prayer-posts';
import {
  fetchPersistedPrayerReactions,
  upsertPersistedPrayerReaction,
} from '@/lib/praybor/prayer-reactions';
import { getPostItPinImage, getPostItPinImageForKey } from '@/components/praybor/postItPins';

type PrayerBoardScreenProps = {
  scope: PrayerVisibility;
  onBack?: () => void;
};

type BoardPagerItem =
  | { type: 'welcome'; id: typeof PUBLIC_BOARD_WELCOME_ID }
  | { type: 'prayer'; card: PrayerCard; id: string };

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
const MAX_RADIUS_KM = 101;
const PUBLIC_BOARD_WELCOME_ID = 'public-board-welcome';
const defaultMapCenter: PrayerLocation = {
  latitude: 43.6532,
  longitude: -79.3832,
};

const postItLayerShadow = Platform.select({
  web: { boxShadow: '0 18px 24px rgba(42, 28, 19, 0.10)' },
  default: {
    shadowColor: '#2a1c13',
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

function longitudeToTileX(longitude: number, zoom: number) {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function latitudeToTileY(latitude: number, zoom: number) {
  const latitudeRadians = (latitude * Math.PI) / 180;

  return Math.floor(
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) *
      2 ** zoom,
  );
}

function getMapZoom(radiusKm: number) {
  if (radiusKm <= 18) {
    return 10;
  }
  if (radiusKm <= 35) {
    return 9;
  }
  if (radiusKm <= 65) {
    return 8;
  }

  return 7;
}

function buildMapTiles(center: PrayerLocation, radiusKm: number) {
  const zoom = getMapZoom(radiusKm);
  const tileX = longitudeToTileX(center.longitude, zoom);
  const tileY = latitudeToTileY(center.latitude, zoom);
  const maxTile = 2 ** zoom;
  const tiles: { id: string; left: `${number}%`; top: `${number}%`; uri: string }[] = [];

  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      const wrappedX = (tileX + x + maxTile) % maxTile;
      const nextY = Math.max(0, Math.min(maxTile - 1, tileY + y));

      tiles.push({
        id: `${zoom}-${wrappedX}-${nextY}`,
        left: `${(x + 1) * 33.333}%`,
        top: `${(y + 1) * 33.333}%`,
        uri: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${nextY}.png`,
      });
    }
  }

  return tiles;
}

export function PrayerBoardScreen({ onBack, scope }: PrayerBoardScreenProps) {
  const colors = Colors.light;
  const { width } = useWindowDimensions();
  const viewportWidth = width > 0 ? width : 390;
  const [composerVisible, setComposerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [radiusKm, setRadiusKm] = useState(MIN_RADIUS_KM);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPublicBoardWelcome, setShowPublicBoardWelcome] = useState(false);
  const [locationResult, setLocationResult] = useState<PrayerLocationResult | null>(
    scope === 'public' ? null : { status: 'unavailable', location: null },
  );
  const [reactions, setReactions] = useState<PrayerReaction[]>([]);
  const [persistedCards, setPersistedCards] = useState<PrayerCard[]>([]);
  const [hasLoadedPersistedCards, setHasLoadedPersistedCards] = useState(false);
  const [reportedCard, setReportedCard] = useState<PrayerCard | null>(null);
  const usePostItPager = scope === 'public';
  const columns = usePostItPager ? 1 : viewportWidth >= 360 ? 2 : 1;

  const shouldUsePreviewCards =
    scope === 'public' &&
    locationResult?.status === 'granted' &&
    hasLoadedPersistedCards &&
    persistedCards.length === 0;
  const cards = shouldUsePreviewCards ? publicPrayerCards : persistedCards;
  const pagerItems: BoardPagerItem[] =
    scope === 'public' && showPublicBoardWelcome
      ? [{ type: 'welcome', id: PUBLIC_BOARD_WELCOME_ID }, ...cards.map((card) => ({ type: 'prayer' as const, card, id: card.id }))]
      : cards.map((card) => ({ type: 'prayer' as const, card, id: card.id }));
  const currentLocation: PrayerLocation | null =
    locationResult?.status === 'granted' ? locationResult.location : null;
  const subtitle =
    scope === 'public'
      ? locationResult?.status === 'denied'
        ? 'Location permission needed'
        : locationResult?.status === 'unavailable'
          ? 'Location unavailable'
        : `${radiusKm} km - ${cards.length} prayers`
      : 'Private group - 3 prayers';

  useEffect(() => {
    let isMounted = true;

    if (scope !== 'public') {
      setShowPublicBoardWelcome(false);

      return () => {
        isMounted = false;
      };
    }

    hasDismissedPublicBoardWelcome()
      .then((dismissed) => {
        if (isMounted) {
          setShowPublicBoardWelcome(!dismissed);
        }
      })
      .catch((error) => {
        console.warn('Could not load public board welcome state.', error);
      });

    return () => {
      isMounted = false;
    };
  }, [scope]);

  useEffect(() => {
    let isMounted = true;

    if (scope === 'public') {
      requestPrayerLocation().then((nextLocationResult) => {
        if (isMounted) {
          setLocationResult(nextLocationResult);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [scope]);

  useEffect(() => {
    let isMounted = true;

    if (scope === 'public' && locationResult === null) {
      return () => {
        isMounted = false;
      };
    }

    if (scope === 'public' && locationResult?.status !== 'granted') {
      setPersistedCards([]);
      setReactions([]);
      setHasLoadedPersistedCards(true);

      return () => {
        isMounted = false;
      };
    }

    setHasLoadedPersistedCards(false);

    fetchPersistedPrayerCards(scope, undefined, {
      radiusKm,
      viewerLocation: currentLocation,
    }).then(async (nextCards) => {
      if (isMounted) {
        setPersistedCards(nextCards);
        setReactions(await fetchPersistedPrayerReactions(nextCards.map((card) => card.id)));
        setHasLoadedPersistedCards(true);
      }
    }).catch((error) => {
      console.warn('Could not load persisted prayer cards.', error);

      if (isMounted) {
        setPersistedCards([]);
        setReactions([]);
        setHasLoadedPersistedCards(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentLocation, locationResult, radiusKm, scope]);

  async function dismissWelcomeCard() {
    setShowPublicBoardWelcome(false);

    try {
      await dismissPublicBoardWelcome();
    } catch (error) {
      console.warn('Could not save public board welcome state.', error);
    }
  }

  async function createPrayerCard(draft: PrayerDraft) {
    let postLocation = currentLocation;

    if (scope === 'public' && !currentLocation) {
      const nextLocationResult = await requestPrayerLocation();

      setLocationResult(nextLocationResult);

      if (nextLocationResult.status !== 'granted') {
        throw new Error('Location permission is required to post a public neighborhood prayer.');
      }

      postLocation = nextLocationResult.location;
    }

    const createdCard = await createPersistedPrayerCard(
      draft,
      scope === 'public' ? postLocation : null,
    );

    setPersistedCards((current) => [
      createdCard,
      ...current.filter((card) => card.id !== createdCard.id),
    ]);

    recordTreeGrowthAction('prayer_posted', scope, undefined, createdCard.id);
  }

  async function retryPrayerLocation() {
    const nextLocationResult = await requestPrayerLocation();

    setLocationResult(nextLocationResult);
  }

  async function reactToPrayer(prayerId: string, type: ReactionType) {
    const isPreviewPrayer = shouldUsePreviewCards && publicPrayerCards.some((card) => card.id === prayerId);

    setReactions((current) =>
      setPrayerReaction(current, {
        prayerId,
        userId: 'current-user',
        type,
      }),
    );

    if (isPreviewPrayer) {
      return;
    }

    try {
      const persistedReaction = await upsertPersistedPrayerReaction(prayerId, type);

      setReactions((current) =>
        setPrayerReaction(
          current.filter((reaction) => !(reaction.prayerId === prayerId && reaction.userId === 'current-user')),
          persistedReaction,
        ),
      );
      recordTreeGrowthAction('reaction_given', scope, undefined, prayerId);
    } catch (error) {
      console.warn('Could not save prayer reaction to Supabase.', error);
    }
  }

  async function reportPrayer({
    blockAuthor,
    details,
    reason,
  }: {
    blockAuthor: boolean;
    details: string;
    reason: PrayerReportReason;
  }) {
    if (!reportedCard) {
      return;
    }

    await submitPrayerReport({
      blockAuthor,
      details,
      prayerId: reportedCard.id,
      reason,
      reportedAuthorId: reportedCard.authorId,
    });

    setPersistedCards((current) =>
      current.filter((card) => {
        if (card.id === reportedCard.id) {
          return false;
        }

        return !blockAuthor || !reportedCard.authorId || card.authorId !== reportedCard.authorId;
      }),
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.headerIcon}>
              <UtilityIcon type="back" size={23} />
            </Pressable>
          ) : (
            <View style={styles.headerIcon} />
          )}
          <View style={styles.headerTitleBlock}>
            <BlessiLogo />
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
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
          locationResult?.status === 'denied' || locationResult?.status === 'unavailable' ? (
            <LocationRecoveryPanel
              result={locationResult}
              onOpenSettings={openPrayerLocationSettings}
              onRetry={retryPrayerLocation}
            />
          ) : (
            <PrayerPostItPager
              items={pagerItems}
              reactions={reactions}
              viewportWidth={viewportWidth}
              onDismissWelcome={dismissWelcomeCard}
              onReact={reactToPrayer}
              onReport={setReportedCard}
            />
          )
        ) : (
          <View style={[styles.boardGrid, { gap: columns === 2 ? 8 : 12 }]}>
            {cards.map((card, index) => (
              <React.Fragment key={card.id}>
                <PrayerCardView
                  card={card}
                  index={index}
                  reactions={reactions.filter((reaction) => reaction.prayerId === card.id)}
                  onReact={(type) => reactToPrayer(card.id, type)}
                  onReport={() => setReportedCard(card)}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write a new prayer request"
          onPress={() => setComposerVisible(true)}
          style={styles.plusButton}>
          <UtilityIcon type="plus" size={25} color="#2a1c13" />
        </Pressable>
      </View>

      <PrayerComposerSheet
        visible={composerVisible}
        defaultVisibility={scope}
        onClose={() => setComposerVisible(false)}
        onCreate={createPrayerCard}
      />

      <BoardSettingsModal
        currentLocation={currentLocation}
        radiusKm={radiusKm}
        visible={settingsVisible}
        onChangeRadius={setRadiusKm}
        onClose={() => setSettingsVisible(false)}
      />

      <PrayerReportModal
        authorLabel={reportedCard?.authorLabel}
        canBlockAuthor={Boolean(reportedCard?.authorId)}
        onClose={() => setReportedCard(null)}
        onSubmit={reportPrayer}
        prayerTitle={reportedCard?.title}
        visible={Boolean(reportedCard)}
      />

      {scope === 'public' ? (
        <OnboardingModal visible={showOnboarding} onClose={() => setShowOnboarding(false)} />
      ) : null}
    </SafeAreaView>
  );
}

function PrayerPostItPager({
  items,
  onDismissWelcome,
  onReact,
  onReport,
  reactions,
  viewportWidth,
}: {
  items: BoardPagerItem[];
  onDismissWelcome: () => void;
  onReact: (prayerId: string, type: ReactionType) => void;
  onReport: (card: PrayerCard) => void;
  reactions: PrayerReaction[];
  viewportWidth: number;
}) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentOffsetX = useRef(0);
  const dragStartOffsetX = useRef(0);
  const welcomeDismissedBySwipe = useRef(false);
  const previousFirstItemType = useRef<BoardPagerItem['type'] | undefined>(items[0]?.type);
  const pageWidth = Math.max(viewportWidth - 36, 284);
  const maxScrollX = Math.max(0, (items.length - 1) * pageWidth);

  const clampScrollOffset = (offset: number) => Math.max(0, Math.min(maxScrollX, offset));

  const scrollToPage = useCallback((page: number, animated = true) => {
    const nextPage = Math.max(0, Math.min(items.length - 1, page));
    const nextOffset = nextPage * pageWidth;

    currentOffsetX.current = nextOffset;
    scrollX.setValue(nextOffset);
    scrollViewRef.current?.scrollTo({ x: nextOffset, animated });
  }, [items.length, pageWidth, scrollX]);

  function maybeDismissWelcomeFromOffset(offset: number) {
    if (welcomeDismissedBySwipe.current || items[0]?.type !== 'welcome') {
      return;
    }

    if (Math.round(offset / pageWidth) > 0) {
      welcomeDismissedBySwipe.current = true;
      onDismissWelcome();
    }
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
    maybeDismissWelcomeFromOffset(currentOffsetX.current);
  }

  useEffect(() => {
    if (previousFirstItemType.current === 'welcome' && items[0]?.type !== 'welcome') {
      welcomeDismissedBySwipe.current = false;
      scrollToPage(0, false);
    }

    previousFirstItemType.current = items[0]?.type;

    if (currentOffsetX.current > maxScrollX) {
      scrollToPage(Math.round(maxScrollX / pageWidth), false);
    }
  }, [items, maxScrollX, pageWidth, scrollToPage]);

  return (
    <View style={styles.postItPager}>
      <View style={[styles.postItDragSurface, webDragSurfaceStyle]} {...dragResponder.panHandlers}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
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
          {items.map((item, index) => {
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
            const noteWidth = Math.min(pageWidth - 10, 344);
            const noteOffsetX = 0;
            const card = item.type === 'prayer' ? item.card : null;
            const cardReactions = card
              ? reactions.filter((reaction) => reaction.prayerId === card.id)
              : [];
            const pinImage =
              card && typeof card.pinSeed === 'number'
                ? getPostItPinImage(card.pinSeed)
                : getPostItPinImageForKey(item.id);

            return (
              <View key={item.id} style={[styles.postItPage, { width: pageWidth }]}>
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
                  {card ? (
                    <PostItPrayerCard
                      card={card}
                      index={index}
                      noteOffsetX={noteOffsetX}
                      noteWidth={noteWidth}
                      pinImage={pinImage}
                      reactions={cardReactions}
                      onReact={(type) => onReact(card.id, type)}
                      onReport={() => onReport(card)}
                    />
                  ) : (
                    <PublicBoardWelcomeCard
                      index={index}
                      noteOffsetX={noteOffsetX}
                      noteWidth={noteWidth}
                      onDismiss={onDismissWelcome}
                      pinImage={pinImage}
                    />
                  )}
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

function BoardSettingsModal({
  currentLocation,
  onChangeRadius,
  onClose,
  radiusKm,
  visible,
}: {
  currentLocation: PrayerLocation | null;
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

            <RadiusMapPreview currentLocation={currentLocation} radiusKm={radiusKm} />
            <RadiusSlider value={radiusKm} onChange={onChangeRadius} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function LocationRecoveryPanel({
  onOpenSettings,
  onRetry,
  result,
}: {
  onOpenSettings: () => void;
  onRetry: () => void;
  result: Exclude<PrayerLocationResult, { status: 'granted' }>;
}) {
  const canOpenSettings = Platform.OS !== 'web' && (result.status === 'unavailable' || !result.canAskAgain);

  return (
    <View style={styles.locationPanel}>
      <View style={styles.locationPanelIcon}>
        <UtilityIcon type="sliders" size={28} color="#FF6628" />
      </View>
      <Text style={styles.locationPanelTitle}>Location is needed for nearby prayers</Text>
      <Text style={styles.locationPanelText}>
        Blessie only uses foreground location to show public prayer requests within your selected radius. Private groups
        still work without location.
      </Text>
      <View style={styles.locationActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try location permission again"
          onPress={onRetry}
          style={({ pressed }) => [styles.locationPrimaryButton, pressed && styles.pressed]}>
          <Text style={styles.locationPrimaryText}>Try again</Text>
        </Pressable>
        {canOpenSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open phone settings for Blessie location permission"
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.locationSecondaryButton, pressed && styles.pressed]}>
            <Text style={styles.locationSecondaryText}>Open Settings</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function RadiusMapPreview({
  currentLocation,
  radiusKm,
}: {
  currentLocation: PrayerLocation | null;
  radiusKm: number;
}) {
  const clampedValue = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, radiusKm));
  const progress = (clampedValue - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM);
  const radiusSize = 222 + progress * 18;
  const outerRadiusSize = Math.min(304, radiusSize + 38);
  const mapCenter = currentLocation ?? defaultMapCenter;
  const tiles = buildMapTiles(mapCenter, clampedValue);

  return (
    <View accessibilityLabel={`Map preview showing a ${clampedValue} kilometer prayer radius`} style={styles.mapPreview}>
      <View pointerEvents="none" style={styles.mapTileLayer}>
        {tiles.map((tile) => (
          <Image
            key={tile.id}
            source={{ uri: tile.uri }}
            resizeMode="cover"
            style={[styles.mapTile, { left: tile.left, top: tile.top }]}
          />
        ))}
      </View>
      <View pointerEvents="none" style={styles.mapWash} />
      <View
        pointerEvents="none"
        style={[
          styles.mapRadiusOuter,
          {
            width: outerRadiusSize,
            height: outerRadiusSize,
            borderRadius: outerRadiusSize / 2,
            transform: [{ translateX: -outerRadiusSize / 2 }, { translateY: -outerRadiusSize / 2 }],
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.mapRadiusCircle,
          {
            width: radiusSize,
            height: radiusSize,
            borderRadius: radiusSize / 2,
            transform: [{ translateX: -radiusSize / 2 }, { translateY: -radiusSize / 2 }],
          },
        ]}
      />
      <View pointerEvents="none" style={styles.mapRadiusInnerLabel}>
        <Text style={styles.mapRadiusInnerText}>{clampedValue} km radius</Text>
      </View>
      <View pointerEvents="none" style={styles.mapCenterPin}>
        <View style={styles.mapCenterDot} />
      </View>
      <View pointerEvents="none" style={[styles.mapPrayerPin, styles.mapPrayerPinOne]} />
      <View pointerEvents="none" style={[styles.mapPrayerPin, styles.mapPrayerPinTwo]} />
      <View pointerEvents="none" style={[styles.mapPrayerPin, styles.mapPrayerPinThree]} />
      <View pointerEvents="none" style={[styles.mapPrayerPin, styles.mapPrayerPinFour]} />
      <View style={styles.mapDistanceBadge}>
        <Text style={styles.mapDistanceText}>{clampedValue} km</Text>
      </View>
      <Text style={styles.mapLocationLabel}>
        {currentLocation ? 'Your current location' : 'Enable location to center this map'}
      </Text>
      <Text style={styles.mapAttribution}>(c) OpenStreetMap</Text>
    </View>
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

  function stepRadius(direction: 1 | -1) {
    onChange(Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, clampedValue + direction * 5)));
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
          accessibilityActions={[
            { name: 'increment', label: 'Increase radius' },
            { name: 'decrement', label: 'Decrease radius' },
          ]}
          accessibilityLabel={`Distance radius, ${clampedValue} kilometers`}
          accessibilityValue={{ min: MIN_RADIUS_KM, max: MAX_RADIUS_KM, now: clampedValue }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') {
              stepRadius(1);
            } else if (event.nativeEvent.actionName === 'decrement') {
              stepRadius(-1);
            }
          }}
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

function PublicBoardWelcomeCard({
  index,
  noteOffsetX,
  noteWidth,
  onDismiss,
  pinImage,
}: {
  index: number;
  noteOffsetX: number;
  noteWidth: number;
  onDismiss: () => void;
  pinImage: ImageSourcePropType;
}) {
  const colors = Colors.light;
  const paperColor = largePostItBackgrounds[index % largePostItBackgrounds.length];
  const noteMinHeight = noteWidth * (1040 / 720);
  const foldShade = getPostItFoldShade(paperColor);
  const foldSide = index % 2 === 0 ? 'right' : 'left';
  const actionTapeTheme = getMaskingTapeTheme(PUBLIC_BOARD_WELCOME_ID, paperColor, 'welcome-action');

  return (
    <View
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
            minHeight: noteMinHeight,
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
        <View style={[styles.postItContentLayer, { minHeight: noteMinHeight }]}>
          <Text style={[styles.welcomeKicker, { color: colors.textTertiary }]}>Public Board</Text>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to Blessie</Text>
          <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
            Swipe through prayers from people nearby. Create groups for family, friends, church, or small circles.
          </Text>
          <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
            Prayers grow trees over time. Check My Page to see your forest, and set prayer reminders when you want a gentle nudge.
          </Text>

          <View style={styles.postItContentSpacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I understand"
            onPress={onDismiss}
            style={[
              styles.welcomeButton,
              {
                backgroundColor: actionTapeTheme.backgroundColor,
                borderColor: actionTapeTheme.borderColor,
              },
            ]}>
            <MaskingTapeSurface theme={actionTapeTheme} tearColor={paperColor} />
            <Text style={[styles.welcomeButtonText, { color: colors.text }]}>I understand</Text>
          </Pressable>
        </View>
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
  onReport,
  pinImage,
  reactions,
}: {
  card: PrayerCard;
  index: number;
  noteOffsetX: number;
  noteWidth: number;
  onReact: (type: ReactionType) => void;
  onReport: () => void;
  pinImage: ImageSourcePropType;
  reactions: PrayerReaction[];
}) {
  const colors = Colors.light;
  const mood = MOODS.find((option) => option.id === card.mood) ?? MOODS[0];
  const [revealed, setRevealed] = useState(!card.isSensitive);
  const prayerCount = reactions.filter((item) => item.type === 'prayer').length;
  const paperColor = card.paperColor ?? largePostItBackgrounds[index % largePostItBackgrounds.length];
  const noteMinHeight = noteWidth * (1040 / 720);
  const foldShade = getPostItFoldShade(paperColor);
  const foldSide = index % 2 === 0 ? 'right' : 'left';
  const sensitiveTapeTheme = getMaskingTapeTheme(card.id, paperColor, 'sensitive-large');
  const reactionTapeTheme = getMaskingTapeTheme(card.id, paperColor, 'reaction-large');

  return (
    <View
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
            minHeight: noteMinHeight,
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
        <View style={[styles.postItContentLayer, { minHeight: noteMinHeight }]}>
          <View style={styles.postItTopRow}>
            <View style={styles.postItMoodRow}>
              <MoodFace mood={card.mood} size={40} />
              <View style={styles.postItMoodText}>
                <Text style={[styles.postItMoodLabel, { color: colors.text }]}>{mood.label}</Text>
                <Text style={[styles.postItMeta, { color: colors.textTertiary }]}>{card.postedAgo}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report this prayer"
              hitSlop={8}
              onPress={onReport}
              style={styles.reportButton}>
              <UtilityIcon type="siren" size={19} color="#FF6628" />
            </Pressable>
          </View>

          <Text style={[styles.postItTitle, { color: colors.text }]} numberOfLines={2}>
            {maskProfanityInText(card.title)}
          </Text>

          {revealed ? (
            <Text style={[styles.postItBody, { color: colors.textSecondary }]}>
              {maskProfanityInText(card.body)}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sensitive prayer. Tap to reveal."
              onPress={() => setRevealed(true)}
              style={[
                styles.postItSensitiveBox,
                {
                  backgroundColor: sensitiveTapeTheme.backgroundColor,
                  borderColor: sensitiveTapeTheme.borderColor,
                },
              ]}>
              <MaskingTapeSurface theme={sensitiveTapeTheme} tearColor={paperColor} />
              <Text style={[styles.postItSensitiveText, { color: colors.text }]}>
                Sensitive prayer. Tap to read with care.
              </Text>
            </Pressable>
          )}

          <Text numberOfLines={1} style={[styles.postItAuthor, { color: colors.textTertiary }]}>
            {card.authorLabel} - {card.groupName ?? card.neighborhood}
          </Text>

          <View style={styles.postItContentSpacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`I prayed for you. ${prayerCount} people prayed for this request.`}
            onPress={() => onReact('prayer')}
            style={[
              styles.postItPrayedButton,
              {
                backgroundColor: reactionTapeTheme.backgroundColor,
                borderColor: reactionTapeTheme.borderColor,
              },
            ]}>
            <MaskingTapeSurface theme={reactionTapeTheme} tearColor={paperColor} />
            <AnimatedAsset assetKey="reaction_prayer" size={24} />
            <Text style={[styles.postItPrayedText, { color: colors.text }]}>I prayed for you</Text>
            <Text style={[styles.postItPrayedCount, { color: colors.text }]}>{prayerCount}</Text>
          </Pressable>
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
  onReport,
  widthStyle,
}: {
  card: PrayerCard;
  index: number;
  compact: boolean;
  reactions: PrayerReaction[];
  onReact: (type: ReactionType) => void;
  onReport: () => void;
  widthStyle: StyleProp<ViewStyle>;
}) {
  const colors = Colors.light;
  const mood = MOODS.find((option) => option.id === card.mood) ?? MOODS[0];
  const [revealed, setRevealed] = useState(!card.isSensitive);
  const prayerCount = reactions.filter((item) => item.type === 'prayer').length;
  const paperColor = card.paperColor ?? cardBackgrounds[index % cardBackgrounds.length];
  const cardSurfaceColor = card.isSensitive && !revealed
    ? colors.backgroundSelected
    : paperColor;
  const sensitiveTapeTheme = getMaskingTapeTheme(card.id, paperColor, 'sensitive-card');
  const reactionTapeTheme = getMaskingTapeTheme(card.id, paperColor, 'reaction-card');

  return (
    <View
      style={[
        styles.prayerCard,
        widthStyle,
        {
          backgroundColor: cardSurfaceColor,
          borderColor: 'rgba(32, 36, 31, 0.04)',
        },
        compact && styles.prayerCardCompact,
      ]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.moodPill, { backgroundColor: `${mood.color}2B` }]}>
          <MoodFace mood={mood.id} size={30} />
          {!compact ? <Text style={[styles.moodChip, { color: colors.text }]}>{mood.label}</Text> : null}
        </View>
        <View style={styles.cardTopActions}>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{card.postedAgo}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report this prayer"
            hitSlop={8}
            onPress={onReport}
            style={styles.cardReportButton}>
            <UtilityIcon type="siren" size={16} color="#FF6628" />
          </Pressable>
        </View>
      </View>
      <Text
        numberOfLines={compact ? 2 : 3}
        style={[styles.cardTitle, compact && styles.cardTitleCompact, { color: colors.text }]}>
        {maskProfanityInText(card.title)}
      </Text>
      {revealed ? (
        <Text
          numberOfLines={compact ? 2 : 4}
          style={[styles.cardBody, compact && styles.cardBodyCompact, { color: colors.textSecondary }]}>
          {maskProfanityInText(card.body)}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sensitive prayer. Tap to reveal."
          onPress={() => setRevealed(true)}
          style={[
            styles.sensitiveBox,
            {
              backgroundColor: sensitiveTapeTheme.backgroundColor,
              borderColor: sensitiveTapeTheme.borderColor,
            },
          ]}>
          <MaskingTapeSurface theme={sensitiveTapeTheme} tearColor={cardSurfaceColor} />
          <Text style={[styles.sensitiveText, { color: colors.text }]}>
            Sensitive prayer. Tap to read with care.
          </Text>
        </Pressable>
      )}
      {!compact ? (
        <Text numberOfLines={1} style={[styles.author, { color: colors.textTertiary }]}>
          {card.authorLabel} - {card.groupName ?? card.neighborhood}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`I prayed for you. ${prayerCount} people prayed for this request.`}
        onPress={() => onReact('prayer')}
        style={[
          styles.prayedButton,
          compact && styles.prayedButtonCompact,
          {
            backgroundColor: reactionTapeTheme.backgroundColor,
            borderColor: reactionTapeTheme.borderColor,
          },
        ]}>
        <MaskingTapeSurface theme={reactionTapeTheme} tearColor={cardSurfaceColor} />
        <AnimatedAsset assetKey="reaction_prayer" size={compact ? 17 : 24} />
        <Text style={[styles.prayedButtonText, compact && styles.prayedButtonTextCompact, { color: colors.text }]}>
          I prayed for you
        </Text>
        <Text style={[styles.prayedButtonCount, compact && styles.prayedButtonCountCompact, { color: colors.text }]}>
          {prayerCount}
        </Text>
      </Pressable>
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
        <SignalWave tint="#FFE0D2" activeTint="#2a1c13" />
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
  pressed: {
    opacity: 0.82,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.select({ web: 172, default: 104 }),
  },
  header: {
    position: 'relative',
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
    position: 'absolute',
    left: 70,
    right: 70,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: -1,
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
    paddingTop: 10,
    paddingBottom: 18,
    alignItems: 'center',
  },
  postItAnimatedShell: {
    paddingTop: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
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
    marginTop: 22,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'visible',
    zIndex: 2,
    ...postItLayerShadow,
  },
  locationPanel: {
    marginTop: 24,
    marginHorizontal: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    ...prayerCardShadow,
  },
  locationPanelIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFF1CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationPanelTitle: {
    color: '#2a1c13',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  locationPanelText: {
    marginTop: 10,
    color: '#69543a',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  locationActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  locationPrimaryButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrimaryText: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  locationSecondaryButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.12)',
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSecondaryText: {
    color: '#513c25',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  postItContentLayer: {
    flexGrow: 1,
    paddingTop: 66,
    paddingRight: 36,
    paddingBottom: 62,
    paddingLeft: 42,
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
    backgroundColor: 'rgba(42, 28, 19, 0.055)',
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
    backgroundColor: 'rgba(42, 28, 19, 0.065)',
    opacity: 0.34,
    transform: [{ rotate: '-1.2deg' }],
  },
  postItTopCrease: {
    position: 'absolute',
    top: 51,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.055)',
  },
  postItEdgeShade: {
    position: 'absolute',
    top: 50,
    right: 0,
    bottom: 16,
    width: 30,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(42, 28, 19, 0.045)',
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
  postItBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: 'rgba(42, 28, 19, 0.046)',
  },
  postItFoldShadow: {
    position: 'absolute',
    bottom: 14,
    width: 42,
    height: 42,
    backgroundColor: 'rgba(42, 28, 19, 0.16)',
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
  reportButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderColor: 'rgba(255, 102, 40, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
  welcomeKicker: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  welcomeBody: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
  },
  welcomeButton: {
    minHeight: 48,
    marginTop: 14,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '0.8deg' }],
  },
  welcomeButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    zIndex: 2,
  },
  postItSensitiveBox: {
    minHeight: 104,
    marginTop: 12,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(189, 128, 86, 0.24)',
    backgroundColor: 'rgba(252, 234, 222, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '-1.2deg' }],
  },
  postItSensitiveText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    zIndex: 2,
  },
  postItAuthor: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  postItContentSpacer: {
    flexGrow: 1,
    minHeight: 30,
  },
  postItPrayedButton: {
    minHeight: 44,
    marginTop: 10,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(255, 102, 40, 0.24)',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 220, 202, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '0.8deg' }],
  },
  postItPrayedText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    zIndex: 2,
  },
  postItPrayedCount: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 138, 91, 0.26)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '900',
    zIndex: 2,
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
  cardTopActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cardReportButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
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
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(38, 91, 59, 0.18)',
    backgroundColor: 'rgba(210, 239, 218, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '-1deg' }],
  },
  sensitiveText: {
    textAlign: 'center',
    fontWeight: '800',
    zIndex: 2,
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
  prayedButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(255, 102, 40, 0.24)',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 220, 202, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '0.8deg' }],
  },
  prayedButtonCompact: {
    marginTop: 9,
    minHeight: 32,
    borderRadius: 0,
    paddingHorizontal: 7,
    gap: 4,
    transform: [{ rotate: '-0.7deg' }],
  },
  prayedButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    zIndex: 2,
  },
  prayedButtonTextCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  prayedButtonCount: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '900',
    zIndex: 2,
  },
  prayedButtonCountCompact: {
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    lineHeight: 20,
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
    color: '#69543a',
    fontSize: 10,
    fontWeight: '800',
  },
  composerBar: {
    position: 'absolute',
    bottom: Platform.select({ web: 132, default: 122 }),
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
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.32)',
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
    color: '#2a1c13',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  settingsSubtitle: {
    maxWidth: 250,
    marginTop: 4,
    color: '#69543a',
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
  mapPreview: {
    position: 'relative',
    height: 260,
    marginTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F8F3EA',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
  },
  mapTileLayer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.04 }],
  },
  mapTile: {
    position: 'absolute',
    width: '34%',
    height: '34%',
  },
  mapWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 239, 0.26)',
  },
  mapPark: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(183, 216, 168, 0.46)',
  },
  mapParkOne: {
    left: -32,
    top: 20,
    width: 160,
    height: 112,
    transform: [{ rotate: '-15deg' }],
  },
  mapParkTwo: {
    right: -28,
    bottom: -12,
    width: 170,
    height: 118,
    transform: [{ rotate: '18deg' }],
  },
  mapRoad: {
    position: 'absolute',
    height: 2,
    left: -24,
    right: -24,
    backgroundColor: 'rgba(42, 28, 19, 0.09)',
  },
  mapRoadOne: {
    top: 34,
    transform: [{ rotate: '-8deg' }],
  },
  mapRoadTwo: {
    top: 82,
    transform: [{ rotate: '11deg' }],
  },
  mapRoadThree: {
    top: 132,
    transform: [{ rotate: '-4deg' }],
  },
  mapRoadFour: {
    top: 178,
    transform: [{ rotate: '6deg' }],
  },
  mapRoadFive: {
    top: 105,
    left: '42%',
    right: 'auto',
    width: 2,
    height: 210,
    transform: [{ rotate: '8deg' }],
  },
  mapRadiusOuter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 102, 40, 0.32)',
    backgroundColor: 'rgba(255, 138, 91, 0.06)',
  },
  mapRadiusCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
    borderColor: '#FF6628',
    backgroundColor: 'rgba(255, 138, 91, 0.18)',
  },
  mapRadiusInnerLabel: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    minHeight: 22,
    minWidth: 90,
    marginLeft: -45,
    marginTop: 20,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  mapRadiusInnerText: {
    color: '#513c25',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  mapCenterPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6628',
  },
  mapCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6628',
  },
  mapPrayerPin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2a1c13',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    opacity: 0.74,
  },
  mapPrayerPinOne: {
    left: '28%',
    top: '32%',
  },
  mapPrayerPinTwo: {
    right: '27%',
    top: '38%',
  },
  mapPrayerPinThree: {
    left: '37%',
    bottom: '25%',
  },
  mapPrayerPinFour: {
    right: '36%',
    bottom: '30%',
  },
  mapDistanceBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDistanceText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  mapLocationLabel: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    maxWidth: 214,
    color: '#2a1c13',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  mapAttribution: {
    position: 'absolute',
    right: 10,
    top: 8,
    color: '#69543a',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    color: '#2a1c13',
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
    color: '#69543a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
});
