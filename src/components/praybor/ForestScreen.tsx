import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
  Image,
  Linking as NativeLinking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Provider } from '@supabase/supabase-js';

import { BlessiLogo } from '@/components/praybor/BlessiLogo';
import { ForestTree, MoodFace, PostItCornerFold, ReactionIcon, UtilityIcon } from '@/components/praybor/PrayborArtwork';
import { getPostItPinImageForKey } from '@/components/praybor/postItPins';
import { Colors } from '@/constants/theme';
import {
  cancelAccountDeletion,
  fetchAccountDeletionRequest,
  isAccountDeletionPending,
  scheduleAccountDeletion,
  type AccountDeletionRequest,
} from '@/lib/praybor/account-deletion';
import { completeCurrentUserProfileConsent, signInWithEmail, signInWithOAuthProvider } from '@/lib/praybor/auth';
import { MOODS, type MoodId } from '@/lib/praybor/domain';
import { resolveProfileSession, uploadProfileAvatar, type ProfileRow } from '@/lib/praybor/profile';
import {
  fetchCurrentUserProfileActivity,
  type PrayerCalendarEntry,
} from '@/lib/praybor/profile-activity';
import {
  fetchPersistedPrayerReminders,
  cancelPrayerReminder,
  persistPrayerReminder,
  reconcilePrayerRemindersWithDevice,
  schedulePrayerReminderNotification,
  type PersistedPrayerReminder,
} from '@/lib/praybor/reminders';
import { getCurrentSupabaseUser, getSupabaseRuntime } from '@/lib/praybor/session';

type ProfileTab = 'board' | 'calendar';

const profileTabs: ProfileTab[] = ['board', 'calendar'];
const REMINDER_WHEEL_ROW_HEIGHT = 44;

type ProfileSessionState = {
  avatarUrl: string | null;
  displayName: string;
  sessionLabel: string;
  signedIn: boolean;
};

type SettingsAccountInfo = {
  displayName: string;
  email: string;
  fullName: string;
  joinedAt: string;
  nickname: string;
  provider: string;
};

const signedOutProfileSession: ProfileSessionState = {
  avatarUrl: null,
  displayName: 'Not signed in',
  sessionLabel: 'Not signed in',
  signedIn: false,
};

type ProfilePrayerItem = {
  color: string;
  count: number;
  body: string;
  id: string;
  mood: MoodId;
  source: string;
  title: string;
};

const colors = Colors.light;

const profileShadow = Platform.select({
  web: { boxShadow: '0 18px 36px rgba(255, 102, 40, 0.14)' },
  default: {
    shadowColor: '#D98E73',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
});

const paperShadow = Platform.select({
  web: { boxShadow: '0 14px 28px rgba(42, 28, 19, 0.12)' },
  default: {
    shadowColor: '#2a1c13',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
});

const metricPillShadow = Platform.select({
  web: { boxShadow: '0 6px 12px rgba(217, 142, 115, 0.16)' },
  default: {
    shadowColor: '#D98E73',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

const prayerStripShadow = Platform.select({
  web: { boxShadow: '0 7px 13px rgba(42, 28, 19, 0.13)' },
  default: {
    shadowColor: '#2a1c13',
    shadowOpacity: 0.13,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
});

export function ForestScreen() {
  const pagerRef = useRef<ScrollView>(null);
  const pagerOffset = useRef(new Animated.Value(0)).current;
  const dragStartOffset = useRef(0);
  const { width: windowWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>('board');
  const [pagerWidth, setPagerWidth] = useState(0);
  const [expandedPrayer, setExpandedPrayer] = useState<ProfilePrayerItem | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [avatarChooserVisible, setAvatarChooserVisible] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const avatarUriRef = useRef<string | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<PrayerCalendarEntry[]>([]);
  const [profileSession, setProfileSession] = useState<ProfileSessionState>(signedOutProfileSession);
  const [profilePrayers, setProfilePrayers] = useState<ProfilePrayerItem[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [prayerCount, setPrayerCount] = useState(0);
  const visibleProfilePrayers = profileSession.signedIn ? profilePrayers : [];
  const resolvedPagerWidth = pagerWidth || windowWidth;
  const indicatorTranslateX = pagerOffset.interpolate({
    inputRange: [0, resolvedPagerWidth],
    outputRange: [0, resolvedPagerWidth / 2],
    extrapolate: 'clamp',
  });
  const activeIndex = profileTabs.indexOf(activeTab);
  const mousePagerResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Platform.OS === 'web' &&
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          dragStartOffset.current = activeIndex * resolvedPagerWidth;
        },
        onPanResponderMove: (_, gestureState) => {
          if (Platform.OS !== 'web') {
            return;
          }

          const nextOffset = Math.max(
            0,
            Math.min(resolvedPagerWidth, dragStartOffset.current - gestureState.dx),
          );

          pagerOffset.setValue(nextOffset);
          pagerRef.current?.scrollTo({ x: nextOffset, animated: false });
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Platform.OS !== 'web') {
            return;
          }

          const shouldAdvance = Math.abs(gestureState.dx) > resolvedPagerWidth * 0.16;
          const nextIndex = shouldAdvance
            ? Math.max(0, Math.min(profileTabs.length - 1, activeIndex + (gestureState.dx < 0 ? 1 : -1)))
            : activeIndex;
          const nextTab = profileTabs[nextIndex];

          setActiveTab(nextTab);
          pagerRef.current?.scrollTo({ x: nextIndex * resolvedPagerWidth, animated: true });
        },
        onPanResponderTerminate: () => {
          pagerRef.current?.scrollTo({ x: activeIndex * resolvedPagerWidth, animated: true });
        },
      }),
    [activeIndex, pagerOffset, resolvedPagerWidth],
  );

  function switchTab(tab: ProfileTab) {
    const nextIndex = profileTabs.indexOf(tab);

    setActiveTab(tab);
    pagerRef.current?.scrollTo({ x: nextIndex * resolvedPagerWidth, animated: true });
  }

  function handlePagerLayout(event: LayoutChangeEvent) {
    setPagerWidth(event.nativeEvent.layout.width);
  }

  function handlePagerSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / resolvedPagerWidth);
    const nextTab = profileTabs[Math.max(0, Math.min(profileTabs.length - 1, nextIndex))];

    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }

  const refreshProfileSession = useCallback(async () => {
    try {
      const user = await getCurrentSupabaseUser();

      if (!user || user.is_anonymous) {
        setProfileSession(signedOutProfileSession);
        setAvatarUri(null);
        setProfilePrayers([]);
        setCalendarEntries([]);
        setRequestCount(0);
        setPrayerCount(0);
        return;
      }

      const { supabase } = await getSupabaseRuntime();
      let profileRow: ProfileRow | null = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name,full_name,nickname,email,avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          profileRow = data as ProfileRow;
        }
      }

      const resolvedProfile = resolveProfileSession(profileRow, user);

      setProfileMessage('');
      setProfileSession({
        avatarUrl: resolvedProfile.avatarUrl,
        displayName: resolvedProfile.displayName,
        sessionLabel: resolvedProfile.sessionLabel,
        signedIn: true,
      });
      setAvatarUri(resolvedProfile.avatarUrl);

      const activity = await fetchCurrentUserProfileActivity();

      setProfilePrayers(activity.prayers);
      setCalendarEntries(activity.calendarEntries);
      setRequestCount(activity.prayerRequests);
      setPrayerCount(activity.prayersSent);
    } catch (error) {
      console.warn('Could not refresh profile session.', error);
      setProfileMessage('Could not refresh your profile. Showing the last available data.');
      setProfileSession((current) => (current.signedIn ? current : signedOutProfileSession));
    }
  }, []);

  useEffect(() => {
    avatarUriRef.current = avatarUri;
  }, [avatarUri]);

  const applyPickedProfilePhoto = useCallback(async (selectedUri: string) => {
    const previousAvatarUri = avatarUriRef.current;

    setAvatarMessage('');
    setAvatarUri(selectedUri);
    setProfileSession((current) => ({
      ...current,
      avatarUrl: selectedUri,
    }));
    setAvatarChooserVisible(false);

    try {
      const uploadedUrl = await uploadProfileAvatar(selectedUri);

      setAvatarUri(uploadedUrl);
      setProfileSession((current) => ({
        ...current,
        avatarUrl: uploadedUrl,
      }));
    } catch (error) {
      setAvatarUri(previousAvatarUri);
      setProfileSession((current) => ({
        ...current,
        avatarUrl: previousAvatarUri,
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function connectSession() {
      await refreshProfileSession();

      const { supabase } = await getSupabaseRuntime();
      const subscription = supabase?.auth.onAuthStateChange(() => {
        if (isMounted) {
          void refreshProfileSession();
        }
      });

      unsubscribe = subscription
        ? () => {
            subscription.data.subscription.unsubscribe();
          }
        : undefined;
    }

    void connectSession();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [refreshProfileSession]);

  useEffect(() => {
    let cancelled = false;

    async function recoverPendingProfilePhoto() {
      if (Platform.OS === 'web') {
        return;
      }

      try {
        const ImagePicker = await import('expo-image-picker');
        const pendingResult = await ImagePicker.getPendingResultAsync?.();
        const selectedUri =
          pendingResult && 'assets' in pendingResult && !pendingResult.canceled
            ? pendingResult.assets?.[0]?.uri ?? null
            : null;

        if (!cancelled && selectedUri) {
          await applyPickedProfilePhoto(selectedUri);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Could not recover pending profile photo.', error);
        }
      }
    }

    void recoverPendingProfilePhoto();

    return () => {
      cancelled = true;
    };
  }, [applyPickedProfilePhoto]);

  async function pickProfilePhoto(source: 'camera' | 'library') {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setAvatarMessage('Photo permission was not granted. You can enable it in phone settings.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.82,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              mediaTypes: ['images'],
              quality: 0.82,
            });

      const selectedUri = result.canceled ? null : result.assets[0]?.uri ?? null;

      if (selectedUri) {
        await applyPickedProfilePhoto(selectedUri);
      }
    } catch (error) {
      console.warn('Could not choose profile photo.', error);
      setAvatarMessage(error instanceof Error ? error.message : 'Could not save this profile photo.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileBlock}>
          <View style={styles.topBar}>
            <View style={styles.topIconSpacer} />
            <BlessiLogo imageStyle={styles.headerLogoImage} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile settings"
              onPress={() => setSettingsVisible(true)}
              style={styles.topIconButton}>
              <UtilityIcon type="sliders" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.profileHeader}>
            <View style={styles.avatarColumn}>
              <View style={styles.avatarShadow}>
                <View style={styles.avatarFrame}>
                  <View style={styles.avatarBackground}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} resizeMode="cover" style={styles.avatarPhoto} />
                    ) : (
                      <>
                        <MoodFace mood="gratitude" size={58} />
                        <View style={styles.avatarSeedling}>
                          <ForestTree species="apple" size={28} />
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.avatarBadge} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile photo"
                  onPress={() => setAvatarChooserVisible(true)}
                  style={styles.avatarAddButton}>
                  <UtilityIcon type="plus" size={18} color="#2a1c13" />
                </Pressable>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text numberOfLines={1} style={styles.profileName}>{profileSession.displayName}</Text>
              {profileMessage ? <Text style={styles.profileStatusText}>{profileMessage}</Text> : null}
              <View style={styles.metricRow}>
                <ProfileMetric label="Prayer requests" value={requestCount} />
                <ProfileMetric label="Prayers sent" value={prayerCount} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tabSection}>
          <View style={styles.segmented}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentIndicator,
                { width: resolvedPagerWidth / 2, transform: [{ translateX: indicatorTranslateX }] },
              ]}
            />
            <View pointerEvents="none" style={styles.segmentDivider} />
            <SegmentButton
              active={activeTab === 'board'}
              label="My Prayer Board"
              onPress={() => switchTab('board')}
            />
            <SegmentButton
              active={activeTab === 'calendar'}
              label="Prayer Calendar"
              onPress={() => switchTab('calendar')}
            />
          </View>

          <Animated.ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            onLayout={handlePagerLayout}
            onMomentumScrollEnd={handlePagerSettled}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: pagerOffset } } }], {
              useNativeDriver: false,
            })}
            onScrollEndDrag={handlePagerSettled}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            snapToInterval={resolvedPagerWidth}
            style={styles.pager}
            {...mousePagerResponder.panHandlers}>
            <View style={[styles.pagerPage, { width: resolvedPagerWidth }]}>
              <PrayerBoardList
                isSignedIn={profileSession.signedIn}
                items={visibleProfilePrayers}
                onOpenPrayer={setExpandedPrayer}
              />
            </View>
            <View style={[styles.pagerPage, { width: resolvedPagerWidth }]}>
              <PrayerCalendarSummary entries={calendarEntries} />
            </View>
          </Animated.ScrollView>
        </View>
      </ScrollView>
      <ProfileSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSessionChanged={refreshProfileSession}
      />
      <AvatarChooserModal
        message={avatarMessage}
        visible={avatarChooserVisible}
        onClose={() => setAvatarChooserVisible(false)}
        onPickCamera={() => pickProfilePhoto('camera')}
        onPickLibrary={() => pickProfilePhoto('library')}
      />
      <ExpandedPrayerModal item={expandedPrayer} onClose={() => setExpandedPrayer(null)} />
    </SafeAreaView>
  );
}

function AvatarChooserModal({
  message,
  onClose,
  onPickCamera,
  onPickLibrary,
  visible,
}: {
  message: string;
  onClose: () => void;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  visible: boolean;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.settingsOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo options"
          onPress={onClose}
          style={styles.settingsScrim}
        />
        <SafeAreaView pointerEvents="box-none" style={styles.settingsSafe}>
          <View style={styles.photoSheet}>
            <View style={styles.settingsHandle} />
            <Text style={styles.settingsTitle}>Profile photo</Text>
            <View style={styles.settingsActionStack}>
              <SettingsActionRow label="Choose from library" onPress={onPickLibrary} />
              <SettingsActionRow label="Take a photo" onPress={onPickCamera} />
            </View>
            {message ? <Text style={styles.settingsErrorText}>{message}</Text> : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ProfileSettingsModal({
  onClose,
  onSessionChanged,
  visible,
}: {
  onClose: () => void;
  onSessionChanged?: () => void | Promise<void>;
  visible: boolean;
}) {
  const [activePanel, setActivePanel] = useState<'main' | 'account' | 'auth' | 'credits' | 'deletion' | 'policy'>('main');
  const [accountInfo, setAccountInfo] = useState<SettingsAccountInfo | null>(null);
  const [accountInfoMessage, setAccountInfoMessage] = useState('');
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deletionError, setDeletionError] = useState('');
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [deletionWorking, setDeletionWorking] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('Guest session');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authWorking, setAuthWorking] = useState(false);
  const deletionPending = isAccountDeletionPending(deletionRequest);

  useEffect(() => {
    let isMounted = true;

    if (!visible) {
      return () => {
        isMounted = false;
      };
    }

    setConfirmDeletion(false);
    setConfirmLogout(false);
    setDeletionError('');
    setActivePanel('main');
    setAuthMessage('');
    fetchAccountDeletionRequest().then((request) => {
      if (isMounted) {
        setDeletionRequest(request);
      }
    });
    refreshSessionLabel();
    refreshSettingsAccountInfo();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  async function refreshSessionLabel() {
    const { supabase } = await getSupabaseRuntime();
    const session = await supabase?.auth.getSession();
    const user = session?.data.session?.user;

    if (!user) {
      setSessionLabel('Not signed in');
      return;
    }

    setSessionLabel(user.email ?? (user.is_anonymous ? 'Guest session' : 'Signed in'));
  }

  async function refreshSettingsAccountInfo() {
    setAccountInfoMessage('');

    try {
      const { supabase } = await getSupabaseRuntime();
      const session = await supabase?.auth.getSession();
      const user = session?.data.session?.user;

      if (!user) {
        setAccountInfo(null);
        return;
      }

      let profileRow: (ProfileRow & { created_at?: string | null }) | null = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name,full_name,nickname,email,created_at')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data) {
          profileRow = data as ProfileRow & { created_at?: string | null };
        }
      }

      const metadata = user.user_metadata ?? {};
      const appMetadata = user.app_metadata ?? {};
      const email = firstSettingsText(profileRow?.email, user.email);
      const fullName = firstSettingsText(profileRow?.full_name, metadata.full_name, metadata.name);
      const nickname = firstSettingsText(profileRow?.nickname, metadata.nickname);
      const displayName = firstSettingsText(
        profileRow?.display_name,
        metadata.display_name,
        fullName,
        nickname,
        email,
      );
      const provider = firstSettingsText(appMetadata.provider, 'email');

      setAccountInfo({
        displayName,
        email,
        fullName,
        joinedAt: profileRow?.created_at ?? user.created_at ?? '',
        nickname,
        provider,
      });
    } catch (error) {
      console.warn('Could not load account information.', error);
      setAccountInfoMessage('Could not load account information.');
    }
  }

  async function openContact() {
    await NativeLinking.openURL('mailto:support@blessie.ca?subject=Blessie%20support');
  }

  async function logout() {
    const { supabase } = await getSupabaseRuntime();

    const { error } = (await supabase?.auth.signOut()) ?? { error: null };

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setAuthMessage('Signed out. Server sessions and stored tokens were cleared.');
    setSessionLabel('Not signed in');
    setAccountInfo(null);
    setConfirmLogout(false);
    await onSessionChanged?.();
  }

  async function authenticateWithPassword(mode: 'signin' | 'signup') {
    setAuthWorking(true);
    setAuthMessage('');

    try {
      if (mode !== 'signin') {
        throw new Error('Create an account from the onboarding sign-in screen so email verification and policy consent are saved.');
      }

      await signInWithEmail({ email: authEmail.trim(), password: authPassword });
      setAuthMessage('Signed in.');
      await refreshSessionLabel();
      await refreshSettingsAccountInfo();
      await onSessionChanged?.();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthWorking(false);
    }
  }

  async function signInWithProvider(provider: Provider) {
    setAuthWorking(true);
    setAuthMessage('');

    try {
      await signInWithOAuthProvider(provider);
      await completeCurrentUserProfileConsent({ notificationOptIn: false });
      setAuthMessage(`Signed in with ${provider}.`);
      await refreshSessionLabel();
      await refreshSettingsAccountInfo();
      await onSessionChanged?.();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : `Could not sign in with ${provider}.`);
    } finally {
      setAuthWorking(false);
    }
  }

  async function requestAccountDeletion() {
    setDeletionWorking(true);
    setDeletionError('');

    try {
      setDeletionRequest(await scheduleAccountDeletion());
      setConfirmDeletion(false);
    } catch (error) {
      console.warn('Could not schedule account deletion.', error);
      setDeletionError('Could not schedule deletion. Please try again.');
    } finally {
      setDeletionWorking(false);
    }
  }

  async function cancelDeletion() {
    setDeletionWorking(true);
    setDeletionError('');

    try {
      setDeletionRequest(await cancelAccountDeletion());
      setConfirmDeletion(false);
    } catch (error) {
      console.warn('Could not cancel account deletion.', error);
      setDeletionError('Could not cancel deletion. Please try again.');
    } finally {
      setDeletionWorking(false);
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.settingsOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close profile settings"
          onPress={onClose}
          style={styles.settingsScrim}
        />
        <SafeAreaView pointerEvents="box-none" style={styles.settingsSafe}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHandle} />
            <View style={styles.settingsHeader}>
              <View>
                <Text style={styles.settingsTitle}>Settings</Text>
                <Text style={styles.settingsSubtitle}>Account and app information</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close profile settings"
                onPress={onClose}
                style={styles.settingsCloseButton}>
                <UtilityIcon type="close" size={20} />
              </Pressable>
            </View>

            {activePanel === 'main' ? (
              <View style={styles.settingsActionStack}>
                <View style={styles.sessionPill}>
                  <Text style={styles.sessionPillLabel}>Current session</Text>
                  <Text numberOfLines={1} style={styles.sessionPillValue}>{sessionLabel}</Text>
                </View>
                <SettingsActionRow label="Account" onPress={() => setActivePanel('account')} />
                {sessionLabel === 'Not signed in' ? (
                  <SettingsActionRow label="Sign in" onPress={() => setActivePanel('auth')} />
                ) : null}
                <SettingsActionRow label="Contact" onPress={openContact} />
                <SettingsActionRow label="Credits" onPress={() => setActivePanel('credits')} />
                <SettingsActionRow label="Policy" onPress={() => setActivePanel('policy')} />
                <SettingsActionRow label="Account deletion" onPress={() => setActivePanel('deletion')} />
                {sessionLabel !== 'Not signed in' ? (
                  <SettingsActionRow destructive label="Log out" onPress={() => setConfirmLogout(true)} />
                ) : null}
                {confirmLogout ? (
                  <LogoutConfirmCard
                    working={authWorking}
                    onKeepSignedIn={() => setConfirmLogout(false)}
                    onLogout={logout}
                  />
                ) : null}
                {authMessage ? <Text style={styles.settingsErrorText}>{authMessage}</Text> : null}
              </View>
            ) : null}

            {activePanel === 'account' ? (
              <AccountInfoPanel
                accountInfo={accountInfo}
                message={accountInfoMessage}
                onBack={() => setActivePanel('main')}
              />
            ) : null}

            {activePanel === 'credits' ? <CreditsPanel onBack={() => setActivePanel('main')} /> : null}

            {activePanel === 'policy' ? <PolicyPanel onBack={() => setActivePanel('main')} /> : null}

            {activePanel === 'auth' ? (
              <AuthPanel
                authEmail={authEmail}
                authMessage={authMessage}
                authPassword={authPassword}
                authWorking={authWorking}
                onBack={() => setActivePanel('main')}
                onChangeEmail={setAuthEmail}
                onChangePassword={setAuthPassword}
                onPasswordSignIn={() => authenticateWithPassword('signin')}
                onProviderSignIn={signInWithProvider}
              />
            ) : null}

            {activePanel === 'deletion' ? (
              <AccountDeletionPanel
                confirmDeletion={confirmDeletion}
                deletionError={deletionError}
                deletionPending={deletionPending}
                deletionRequest={deletionRequest}
                deletionWorking={deletionWorking}
                onBack={() => setActivePanel('main')}
                onCancelDeletion={cancelDeletion}
                onConfirmDeletion={requestAccountDeletion}
                onKeepAccount={() => setConfirmDeletion(false)}
                onStartDeletion={() => setConfirmDeletion(true)}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function AccountInfoPanel({
  accountInfo,
  message,
  onBack,
}: {
  accountInfo: SettingsAccountInfo | null;
  message: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.policyPanel}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.policyBackButton}>
        <UtilityIcon type="back" size={18} />
        <Text style={styles.policyBackText}>Back</Text>
      </Pressable>
      <Text style={styles.policyTitle}>Account</Text>
      <View style={styles.accountInfoCard}>
        <AccountInfoRow label="Joined" value={formatAccountInfoDate(accountInfo?.joinedAt)} />
        <AccountInfoRow label="Name" value={accountInfo?.fullName || accountInfo?.displayName || 'Not set'} />
        <AccountInfoRow label="Display name" value={accountInfo?.displayName || 'Not set'} />
        <AccountInfoRow label="Account ID" value={accountInfo?.nickname || 'Not set'} />
        <AccountInfoRow label="Email" value={accountInfo?.email || 'Not set'} />
        <AccountInfoRow label="Sign-in method" value={accountInfo?.provider || 'Not signed in'} />
      </View>
      {message ? <Text style={styles.settingsErrorText}>{message}</Text> : null}
    </View>
  );
}

function AccountInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.accountInfoRow}>
      <Text style={styles.accountInfoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.accountInfoValue}>{value}</Text>
    </View>
  );
}

function LogoutConfirmCard({
  onKeepSignedIn,
  onLogout,
  working,
}: {
  onKeepSignedIn: () => void;
  onLogout: () => void;
  working: boolean;
}) {
  return (
    <View style={styles.accountDeletionCard}>
      <Text style={styles.accountDeletionTitle}>Log out of Blessie?</Text>
      <Text style={styles.accountDeletionText}>
        This ends the Supabase session on this device. Your prayers and groups stay saved on your account.
      </Text>
      <View style={styles.deletionConfirmRow}>
        <Pressable accessibilityRole="button" onPress={onKeepSignedIn} style={styles.keepAccountButton}>
          <Text style={styles.keepAccountText}>Keep signed in</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={working}
          onPress={onLogout}
          style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed, working && styles.disabledSettingsButton]}>
          <Text style={styles.confirmDeleteText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PolicyPanel({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.policyPanel}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.policyBackButton}>
        <UtilityIcon type="back" size={18} />
        <Text style={styles.policyBackText}>Back</Text>
      </Pressable>
      <Text style={styles.policyTitle}>Privacy and safety policy</Text>
      <ScrollView style={styles.policyScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.policySectionTitle}>Account and storage</Text>
        <Text style={styles.policyBody}>
          Blessie stores prayer requests, private group posts, reactions, reports, blocks, profile details, prayer
          reminder preferences, and tree growth events on Supabase. This keeps your prayer data available across devices
          after you sign in.
        </Text>
        <Text style={styles.policySectionTitle}>Public prayer radius</Text>
        <Text style={styles.policyBody}>
          Public board prayers request foreground location permission so nearby prayers can be filtered by your selected
          distance. Location is used for the prayer board experience and is not required for private groups. In web
          preview, Blessie uses a preview fallback so posting can still be tested without a native permission dialog.
        </Text>
        <Text style={styles.policySectionTitle}>Private groups</Text>
        <Text style={styles.policyBody}>
          Private group posts are intended for authenticated group members only. The group owner is added as a member
          when the group is created, and new members join with the invite code flow. Group prayers are not shown on the
          public neighborhood board.
        </Text>
        <Text style={styles.policySectionTitle}>Reports, blocking, and filtering</Text>
        <Text style={styles.policyBody}>
          The siren report button lets you choose a reason and add context. Reported prayers are hidden from your view
          immediately. If you also block the author, future prayers from that author are hidden for your account.
          Profanity is masked by keeping the first character visible and obscuring the rest, and sensitive prayers can
          be hidden behind a tap-to-reveal state.
        </Text>
        <Text style={styles.policySectionTitle}>Notifications</Text>
        <Text style={styles.policyBody}>
          Prayer reminders are optional local notifications. Blessie asks for notification permission before scheduling
          them, and you can disable notifications anytime in system settings.
        </Text>
        <Text style={styles.policySectionTitle}>Deletion</Text>
        <Text style={styles.policyBody}>
          Account and data deletion can be requested in Settings. Blessie asks for a second confirmation, then schedules
          deletion after a 24-hour grace period. You can cancel the deletion request from this screen before the grace
          period ends.
        </Text>
        <Text style={styles.policySectionTitle}>Contact</Text>
        <Text style={styles.policyBody}>
          For support, safety concerns, or data requests, contact support@blessie.ca.
        </Text>
      </ScrollView>
    </View>
  );
}

function CreditsPanel({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.policyPanel}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.policyBackButton}>
        <UtilityIcon type="back" size={18} />
        <Text style={styles.policyBackText}>Back</Text>
      </Pressable>
      <Text style={styles.policyTitle}>Credits</Text>
      <View style={styles.creditsCard}>
        <Text style={styles.creditsLabel}>Blessie</Text>
        <Text style={styles.creditsText}>
          Blessie is shaped around a simple practice: sharing prayer requests, quietly carrying one another, and
          watching small acts of faith become visible over time. The experience combines a nearby prayer board,
          private group spaces, gentle reminders, and a growing faith forest so prayer feels less isolated and more
          present in daily life.
        </Text>
        <View style={styles.creditsIdeaRow}>
          <Text style={styles.creditsIdeaLabel}>Idea by</Text>
          <Text style={styles.creditsIdeaName}>Alyssa Byeon</Text>
        </View>
      </View>
    </View>
  );
}

function AuthPanel({
  authEmail,
  authMessage,
  authPassword,
  authWorking,
  onBack,
  onChangeEmail,
  onChangePassword,
  onPasswordSignIn,
  onProviderSignIn,
}: {
  authEmail: string;
  authMessage: string;
  authPassword: string;
  authWorking: boolean;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onPasswordSignIn: () => void;
  onProviderSignIn: (provider: Provider) => void;
}) {
  return (
    <View style={styles.policyPanel}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.policyBackButton}>
        <UtilityIcon type="back" size={18} />
        <Text style={styles.policyBackText}>Back</Text>
      </Pressable>
      <Text style={styles.policyTitle}>Sign in</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={onChangeEmail}
        placeholder="Email"
        placeholderTextColor="#9C918A"
        style={styles.authInput}
        value={authEmail}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        onChangeText={onChangePassword}
        placeholder="Password"
        placeholderTextColor="#9C918A"
        secureTextEntry
        style={styles.authInput}
        value={authPassword}
      />
      <View style={styles.authButtonGrid}>
        <Pressable
          accessibilityRole="button"
          disabled={authWorking}
          onPress={onPasswordSignIn}
          style={({ pressed }) => [styles.authButton, pressed && styles.pressed, authWorking && styles.disabledSettingsButton]}>
          <Text style={styles.authButtonText}>Sign in</Text>
        </Pressable>
        <View style={styles.authSignupSpacer}>
          <Text style={styles.authSignupHint}>Create accounts from the welcome sign-in screen.</Text>
        </View>
      </View>
      <View style={styles.authProviderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
          disabled={authWorking}
          onPress={() => onProviderSignIn('google')}
          style={({ pressed }) => [styles.providerButton, pressed && styles.pressed, authWorking && styles.disabledSettingsButton]}>
          <Text style={styles.providerButtonText}>Google</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in with Apple"
          disabled={authWorking}
          onPress={() => onProviderSignIn('apple')}
          style={({ pressed }) => [styles.providerButton, pressed && styles.pressed, authWorking && styles.disabledSettingsButton]}>
          <Text style={styles.providerButtonText}>Apple</Text>
        </Pressable>
      </View>
      {authMessage ? <Text style={styles.settingsErrorText}>{authMessage}</Text> : null}
    </View>
  );
}

function AccountDeletionPanel({
  confirmDeletion,
  deletionError,
  deletionPending,
  deletionRequest,
  deletionWorking,
  onBack,
  onCancelDeletion,
  onConfirmDeletion,
  onKeepAccount,
  onStartDeletion,
}: {
  confirmDeletion: boolean;
  deletionError: string;
  deletionPending: boolean;
  deletionRequest: AccountDeletionRequest | null;
  deletionWorking: boolean;
  onBack: () => void;
  onCancelDeletion: () => void;
  onConfirmDeletion: () => void;
  onKeepAccount: () => void;
  onStartDeletion: () => void;
}) {
  return (
    <View style={styles.policyPanel}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.policyBackButton}>
        <UtilityIcon type="back" size={18} />
        <Text style={styles.policyBackText}>Back</Text>
      </Pressable>
      <Text style={styles.policyTitle}>Account deletion</Text>
      <View style={styles.accountDeletionCard}>
        <Text style={styles.accountDeletionTitle}>
          {deletionPending ? 'Deletion is scheduled' : 'Request account and data deletion'}
        </Text>
        <Text style={styles.accountDeletionText}>
          {deletionPending
            ? `Your account is scheduled for deletion on ${formatSettingsDate(deletionRequest?.scheduledFor)}. You can cancel before then.`
            : 'This starts a 24-hour grace period before your account, profile, prayer posts, groups, reactions, reports, and growth data are deleted.'}
        </Text>
        {deletionPending ? (
          <Pressable
            accessibilityRole="button"
            disabled={deletionWorking}
            onPress={onCancelDeletion}
            style={({ pressed }) => [styles.cancelDeletionButton, pressed && styles.pressed, deletionWorking && styles.disabledSettingsButton]}>
            <Text style={styles.cancelDeletionText}>Cancel deletion</Text>
          </Pressable>
        ) : confirmDeletion ? (
          <View style={styles.deletionConfirmRow}>
            <Pressable accessibilityRole="button" onPress={onKeepAccount} style={styles.keepAccountButton}>
              <Text style={styles.keepAccountText}>Keep account</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={deletionWorking}
              onPress={onConfirmDeletion}
              style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed, deletionWorking && styles.disabledSettingsButton]}>
              <Text style={styles.confirmDeleteText}>Confirm deletion</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={onStartDeletion} style={styles.deleteAccountButton}>
            <Text style={styles.deleteAccountText}>Start deletion request</Text>
          </Pressable>
        )}
        {deletionError ? <Text style={styles.settingsErrorText}>{deletionError}</Text> : null}
      </View>
    </View>
  );
}

function formatSettingsDate(value?: string) {
  if (!value) {
    return '24 hours from now';
  }

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatAccountInfoDate(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function firstSettingsText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

function SettingsActionRow({
  destructive,
  detail,
  label,
  onPress,
}: {
  destructive?: boolean;
  detail?: string;
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsActionRow,
        destructive && styles.settingsActionRowDestructive,
        pressed && styles.pressed,
      ]}>
      <View style={styles.settingsActionText}>
        <Text style={[styles.settingsActionLabel, destructive && styles.settingsActionLabelDestructive]}>
          {label}
        </Text>
        {detail ? <Text style={styles.settingsActionDetail}>{detail}</Text> : null}
      </View>
      <Text style={[styles.settingsActionArrow, destructive && styles.settingsActionLabelDestructive]}>
        -&gt;
      </Text>
    </Pressable>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={[styles.metricPill, metricPillShadow]}>
        <View pointerEvents="none" style={styles.metricPillStripe} />
        <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && styles.segmentPressed,
      ]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PrayerBoardList({
  isSignedIn,
  items,
  onOpenPrayer,
}: {
  isSignedIn: boolean;
  items: ProfilePrayerItem[];
  onOpenPrayer: (item: ProfilePrayerItem) => void;
}) {
  const emptyTitle = isSignedIn ? 'No prayer requests yet' : 'Sign in to see your prayer board';
  const emptyText = isSignedIn
    ? 'Prayer requests you share and prayers you carry will appear here after your first post or prayer.'
    : 'Log in to keep your prayer board, groups, calendar, and forest synced.';

  return (
    <View style={styles.paperBoard}>
      <View pointerEvents="none" style={styles.paperTopTape} />
      <View pointerEvents="none" style={styles.paperGrain} />
      {items.length === 0 ? (
        <View style={styles.emptyPrayerBoard}>
          <Text style={styles.emptyPrayerBoardTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyPrayerBoardText}>{emptyText}</Text>
        </View>
      ) : null}
      {items.map((item, index) => (
        <ProfilePrayerRow key={item.id} item={item} index={index} onOpenPrayer={onOpenPrayer} />
      ))}
    </View>
  );
}

function ProfilePrayerRow({
  index,
  item,
  onOpenPrayer,
}: {
  index: number;
  item: ProfilePrayerItem;
  onOpenPrayer: (item: ProfilePrayerItem) => void;
}) {
  const mood = MOODS.find((option) => option.id === item.mood) ?? MOODS[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.count} people prayed`}
      onPress={() => onOpenPrayer(item)}
      style={({ pressed }) => [
        styles.prayerRow,
        { backgroundColor: item.color },
        prayerStripShadow,
        index % 2 === 0 ? styles.rowTiltLeft : styles.rowTiltRight,
        pressed && styles.pressed,
      ]}>
      <View pointerEvents="none" style={styles.rowSideBand} />
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <MoodFace mood={item.mood} size={22} />
          <Text style={styles.rowSource}>{item.source}</Text>
          <Text style={styles.rowMood}>{mood.label}</Text>
        </View>
        <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.rowBody}>{item.body}</Text>
        <View style={styles.rowFooter}>
          <ReactionIcon type="prayer" size={13} />
          <Text style={styles.rowFooterText}>{item.count} people prayed</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ExpandedPrayerModal({ item, onClose }: { item: ProfilePrayerItem | null; onClose: () => void }) {
  const fallY = useRef(new Animated.Value(0)).current;
  const fallX = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(1)).current;
  const mood = item ? (MOODS.find((option) => option.id === item.mood) ?? MOODS[0]) : MOODS[0];
  const foldSide = item && item.id.length % 2 === 0 ? 'right' : 'left';
  const pinImage = item ? getPostItPinImageForKey(item.id) : null;
  const cardRotate = fallY.interpolate({
    inputRange: [-90, 0, 260],
    outputRange: ['-4deg', '0deg', '13deg'],
    extrapolate: 'clamp',
  });
  const cardScale = fallY.interpolate({
    inputRange: [-80, 0, 240],
    outputRange: [1.02, 1, 0.94],
    extrapolate: 'clamp',
  });
  const cardOpacity = fallY.interpolate({
    inputRange: [0, 180, 320],
    outputRange: [1, 0.86, 0],
    extrapolate: 'clamp',
  });
  const animateFallClose = useCallback((dx = 0) => {
    Animated.parallel([
      Animated.timing(fallY, {
        toValue: 420,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(fallX, {
        toValue: dx * 0.28,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [fallX, fallY, modalOpacity, onClose]);
  const modalDragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          fallY.setValue(Math.max(-60, gestureState.dy));
          fallX.setValue(gestureState.dx * 0.18);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 96 || gestureState.vy > 0.72) {
            animateFallClose(gestureState.dx);
            return;
          }

          Animated.spring(fallY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 95,
            friction: 10,
          }).start();
          Animated.spring(fallX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 95,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(fallY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 95,
            friction: 10,
          }).start();
          Animated.spring(fallX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 95,
            friction: 10,
          }).start();
        },
      }),
    [animateFallClose, fallX, fallY],
  );

  useEffect(() => {
    if (!item) {
      return;
    }

    fallX.setValue(0);
    fallY.setValue(0);
    modalOpacity.setValue(1);
  }, [fallX, fallY, item, modalOpacity]);

  return (
    <Modal animationType="fade" transparent visible={Boolean(item)} onRequestClose={() => animateFallClose()}>
      <View style={styles.expandedBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close prayer preview"
          style={styles.expandedBackdropPressArea}
          onPress={() => animateFallClose()}
        />
        {item ? (
          <Animated.View
            style={[
              styles.expandedCard,
              { backgroundColor: item.color },
              paperShadow,
              {
                opacity: Animated.multiply(modalOpacity, cardOpacity),
                transform: [
                  { translateX: fallX },
                  { translateY: fallY },
                  { rotate: cardRotate },
                  { scale: cardScale },
                ],
              },
            ]}>
            <View
              style={styles.expandedDragSurface}
              {...modalDragResponder.panHandlers}
            />
            <View pointerEvents="none" style={styles.expandedPaperGrain} />
            <View pointerEvents="none" style={styles.expandedAdhesiveBand} />
            <View pointerEvents="none" style={styles.expandedTopCrease} />
            <View pointerEvents="none" style={styles.expandedBottomShade} />
            <View
              pointerEvents="none"
              style={[
                styles.expandedFold,
                foldSide === 'right' ? styles.expandedFoldRight : styles.expandedFoldLeft,
              ]}>
              <PostItCornerFold color={item.color} side={foldSide} size={68} />
            </View>
            <View pointerEvents="none" style={styles.expandedPinWrap}>
              {pinImage ? <Image source={pinImage} resizeMode="contain" style={styles.expandedPinImage} /> : null}
            </View>
            <View style={styles.expandedHeader}>
              <MoodFace mood={item.mood} size={38} />
              <View style={styles.expandedMeta}>
                <Text style={styles.expandedSource}>{item.source}</Text>
                <Text style={styles.expandedMood}>{mood.label}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => animateFallClose()} style={styles.expandedClose}>
                <UtilityIcon type="close" size={20} color="#2a1c13" />
              </Pressable>
            </View>
            <Text style={styles.expandedTitle}>{item.title}</Text>
            <ScrollView style={styles.expandedBodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.expandedBody}>{item.body}</Text>
            </ScrollView>
            <View style={styles.expandedFooter}>
              <ReactionIcon type="prayer" size={16} />
              <Text style={styles.expandedFooterText}>{item.count} people prayed</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

type PrayerReminder = PersistedPrayerReminder;

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthDate(date: Date, day = 1) {
  return new Date(date.getFullYear(), date.getMonth(), day);
}

function addCalendarMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function buildReminderDate(date: Date, hour: number, minute: number, meridiem: 'AM' | 'PM') {
  const normalizedHour = meridiem === 'PM' ? (hour % 12) + 12 : hour % 12;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), normalizedHour, minute, 0, 0);
}

function formatReminderTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isSameReminderMinute(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
    && left.getHours() === right.getHours()
    && left.getMinutes() === right.getMinutes()
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapReminderHour(hour: number) {
  if (hour < 1) {
    return 12;
  }

  if (hour > 12) {
    return 1;
  }

  return hour;
}

function wrapReminderMinute(minute: number) {
  return ((minute % 60) + 60) % 60;
}

function formatReminderMinute(minute: number) {
  return `${wrapReminderMinute(minute)}`.padStart(2, '0');
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function formatSelectedWeekday(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function TimeWheelColumn({
  accessibilityLabel,
  canStep,
  currentLabel,
  mutedTextStyle,
  nextLabel,
  onStep,
  previousLabel,
  selectedTextStyle,
  style,
}: {
  accessibilityLabel: string;
  canStep?: (delta: number) => boolean;
  currentLabel: string;
  mutedTextStyle?: TextStyle;
  nextLabel: string;
  onStep: (delta: number) => void;
  previousLabel: string;
  selectedTextStyle?: TextStyle;
  style?: ViewStyle;
}) {
  const dragOffset = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const lastWheelAtRef = useRef(0);
  const handleWheel = useCallback((event: unknown) => {
    const wheelEvent = event as {
      deltaY?: number;
      preventDefault?: () => void;
      nativeEvent?: {
        deltaY?: number;
        preventDefault?: () => void;
      };
    };
    const deltaY = wheelEvent.nativeEvent?.deltaY ?? wheelEvent.deltaY ?? 0;
    const now = Date.now();

    if (Math.abs(deltaY) < 3 || now - lastWheelAtRef.current < 120) {
      return;
    }

    lastWheelAtRef.current = now;
    wheelEvent.preventDefault?.();
    wheelEvent.nativeEvent?.preventDefault?.();
    const delta = deltaY > 0 ? 1 : -1;

    if (canStep && !canStep(delta)) {
      return;
    }

    onStep(delta);
  }, [canStep, onStep]);
  const wheelProps = Platform.OS === 'web' ? ({ onWheel: handleWheel } as Record<string, unknown>) : undefined;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderMove: (_, gestureState) => {
          if (isAnimatingRef.current) {
            return;
          }

          dragOffset.setValue(clampNumber(gestureState.dy, -REMINDER_WHEEL_ROW_HEIGHT, REMINDER_WHEEL_ROW_HEIGHT));
        },
        onPanResponderRelease: (_, gestureState) => {
          const delta = gestureState.dy < -20 || gestureState.vy < -0.35 ? 1 : gestureState.dy > 20 || gestureState.vy > 0.35 ? -1 : 0;

          if (!delta || (canStep && !canStep(delta))) {
            Animated.spring(dragOffset, {
              toValue: 0,
              useNativeDriver: true,
              tension: 90,
              friction: 12,
            }).start();
            return;
          }

          isAnimatingRef.current = true;
          Animated.timing(dragOffset, {
            toValue: delta > 0 ? -REMINDER_WHEEL_ROW_HEIGHT : REMINDER_WHEEL_ROW_HEIGHT,
            duration: 130,
            useNativeDriver: true,
          }).start(() => {
            onStep(delta);
            dragOffset.setValue(0);
            isAnimatingRef.current = false;
          });
        },
        onPanResponderTerminate: () => {
          isAnimatingRef.current = false;
          Animated.spring(dragOffset, {
            toValue: 0,
            useNativeDriver: true,
            tension: 90,
            friction: 12,
          }).start();
        },
      }),
    [canStep, dragOffset, onStep],
  );

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: currentLabel }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          if (canStep && !canStep(1)) {
            return;
          }

          onStep(1);
        }

        if (event.nativeEvent.actionName === 'decrement') {
          if (canStep && !canStep(-1)) {
            return;
          }

          onStep(-1);
        }
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase' },
        { name: 'decrement', label: 'Decrease' },
      ]}
      style={({ pressed }) => [styles.reminderDialColumn, style, pressed && styles.pressed]}
      {...wheelProps}
      {...panResponder.panHandlers}>
      <Animated.View style={[styles.reminderWheelTrack, { transform: [{ translateY: dragOffset }] }]}>
        <Text style={[styles.reminderDialMuted, mutedTextStyle]}>{previousLabel}</Text>
        <Text style={[styles.reminderDialSelected, selectedTextStyle]}>{currentLabel}</Text>
        <Text style={[styles.reminderDialMuted, mutedTextStyle]}>{nextLabel}</Text>
      </Animated.View>
    </Pressable>
  );
}

function MeridiemSelector({
  onChange,
  value,
}: {
  onChange: (value: 'AM' | 'PM') => void;
  value: 'AM' | 'PM';
}) {
  const canStep = useCallback((delta: number) => (value === 'AM' ? delta > 0 : delta < 0), [value]);
  const handleStep = useCallback((delta: number) => {
    if (!canStep(delta)) {
      return;
    }

    onChange(delta > 0 ? 'PM' : 'AM');
  }, [canStep, onChange]);

  return (
    <TimeWheelColumn
      accessibilityLabel="Reminder AM or PM"
      canStep={canStep}
      currentLabel={value}
      mutedTextStyle={styles.reminderDialMeridiemMuted}
      nextLabel={value === 'AM' ? 'PM' : ' '}
      onStep={handleStep}
      previousLabel={value === 'PM' ? 'AM' : ' '}
      selectedTextStyle={styles.reminderDialMeridiem}
      style={styles.reminderMeridiemColumn}
    />
  );
}

function PrayerCalendarSummary({ entries }: { entries: PrayerCalendarEntry[] }) {
  const [reminderMessage, setReminderMessage] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthDate(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [reminderHour, setReminderHour] = useState(7);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderMeridiem, setReminderMeridiem] = useState<'AM' | 'PM'>('AM');
  const [scheduledReminders, setScheduledReminders] = useState<PrayerReminder[]>([]);
  const today = useMemo(() => new Date(), []);
  const monthStart = getMonthDate(visibleMonth);
  const daysInMonth = getDaysInMonth(visibleMonth);
  const leadingEmptyDays = monthStart.getDay();
  const monthLabel = visibleMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const calendarCells = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const selectedDay = selectedDate.getDate();
  const selectedDateKey = getDateKey(selectedDate);
  const entryByDateKey = useMemo(() => new Map(entries.map((entry) => [entry.dateKey, entry])), [entries]);
  const entryByDay = useMemo(() => {
    const monthPrefix = getDateKey(monthStart).slice(0, 7);

    return new Map(
      entries
        .filter((entry) => entry.dateKey.startsWith(monthPrefix))
        .map((entry) => [entry.day, entry]),
    );
  }, [entries, monthStart]);
  const selectedEntry = entryByDateKey.get(selectedDateKey) ?? {
    dateKey: selectedDateKey,
    day: selectedDay,
    sent: 0,
    received: 0,
  };
  const selectedTotal = selectedEntry.sent + selectedEntry.received;
  const selectedReminders = scheduledReminders.filter((reminder) => reminder.dateKey === selectedDateKey);
  const selectedReminderTarget = useMemo(
    () => buildReminderDate(selectedDate, reminderHour, reminderMinute, reminderMeridiem),
    [reminderHour, reminderMeridiem, reminderMinute, selectedDate],
  );
  const reminderAlreadyExists = scheduledReminders.some((reminder) =>
    isSameReminderMinute(reminder.scheduledFor, selectedReminderTarget),
  );
  const reminderTimeIsPast = selectedReminderTarget.getTime() <= Date.now();
  const canAddReminder = !reminderAlreadyExists && !reminderTimeIsPast;
  const reminderFooterText = reminderMessage
    || (reminderAlreadyExists
      ? 'A reminder already exists for this time.'
      : reminderTimeIsPast
        ? 'Choose a future time for this reminder.'
        : 'Your calendar shows where prayer was shared and received across the month.');
  const selectedDateIsToday = getDateKey(selectedDate) === getDateKey(today);
  const previousHour = wrapReminderHour(reminderHour - 1);
  const nextHour = wrapReminderHour(reminderHour + 1);
  const previousMinute = formatReminderMinute(reminderMinute - 1);
  const nextMinute = formatReminderMinute(reminderMinute + 1);

  useEffect(() => {
    let isMounted = true;

    fetchPersistedPrayerReminders().then((reminders) => reconcilePrayerRemindersWithDevice(reminders)).then((reminders) => {
      if (isMounted) {
        setScheduledReminders(reminders);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function moveMonth(amount: number) {
    setVisibleMonth((currentMonth) => {
      const nextMonth = addCalendarMonths(currentMonth, amount);
      const nextDay = Math.min(selectedDate.getDate(), getDaysInMonth(nextMonth));
      const nextSelectedDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);

      setSelectedDate(nextSelectedDate);
      setReminderMessage('');
      return nextMonth;
    });
  }

  async function addPrayerReminder() {
    setReminderMessage('');
    const scheduledFor = selectedReminderTarget;

    if (reminderAlreadyExists) {
      setReminderMessage('A reminder already exists for this time.');
      return;
    }

    if (scheduledFor.getTime() <= Date.now()) {
      setReminderMessage('Choose a future date and time for this reminder.');
      return;
    }

    try {
      const result = await schedulePrayerReminderNotification(scheduledFor);
      const persistedReminder = await persistPrayerReminder(result);
      const reminderToStore = persistedReminder ?? {
        dateKey: selectedDateKey,
        id: result.id,
        native: result.native,
        notificationId: result.id,
        scheduledFor: result.scheduledFor,
      };

      setScheduledReminders((current) => [
        ...current,
        reminderToStore,
      ]);
      setReminderMessage(
        result.native
          ? `Reminder scheduled for ${formatReminderTime(scheduledFor)}.`
          : `Preview reminder added for ${formatReminderTime(scheduledFor)}.`,
      );
    } catch (error) {
      console.warn('Could not schedule prayer reminder.', error);
      setReminderMessage(error instanceof Error ? error.message : 'Could not schedule this reminder.');
    }
  }

  async function removePrayerReminder(reminder: PrayerReminder) {
    setReminderMessage('');

    try {
      await cancelPrayerReminder(reminder);
      setScheduledReminders((current) => current.filter((item) => item.id !== reminder.id));
      setReminderMessage('Reminder canceled.');
    } catch (error) {
      console.warn('Could not cancel prayer reminder.', error);
      setReminderMessage(error instanceof Error ? error.message : 'Could not cancel this reminder.');
    }
  }

  return (
    <View style={styles.calendarStack}>
      <View style={[styles.calendarPanel, paperShadow]}>
        <View style={styles.calendarTopRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Current calendar month ${monthLabel}`}
            onPress={() => {
              const now = new Date();

              setVisibleMonth(getMonthDate(now));
              setSelectedDate(now);
              setReminderMessage('');
            }}
            style={({ pressed }) => [styles.monthPill, pressed && styles.pressed]}>
            <View pointerEvents="none" style={styles.monthGlyph}>
              <View style={styles.monthGlyphTop} />
              <View style={styles.monthGlyphLine} />
              <View style={[styles.monthGlyphLine, styles.monthGlyphLineShort]} />
            </View>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <UtilityIcon type="chevronDown" size={16} color="#69543a" />
          </Pressable>
          <View style={styles.calendarNavGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show previous month"
              onPress={() => moveMonth(-1)}
              style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}>
              <UtilityIcon type="back" size={17} color="#69543a" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show next month"
              onPress={() => moveMonth(1)}
              style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}>
              <View style={styles.calendarNextIcon}>
                <UtilityIcon type="back" size={17} color="#69543a" />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.calendarWeekdays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
            <Text key={`${weekday}-${index}`} style={styles.calendarWeekday}>
              {weekday}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarCells.map((day, index) => {
            const entry = day ? entryByDay.get(day) : null;
            const cellDate = day ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null;
            const selected = cellDate ? getDateKey(cellDate) === selectedDateKey : false;
            const isToday = cellDate ? getDateKey(cellDate) === getDateKey(today) : false;
            const activityTotal = (entry?.sent ?? 0) + (entry?.received ?? 0);

            return day ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${monthLabel} ${day}, ${entry?.sent ?? 0} prayers sent and ${entry?.received ?? 0} prayers received`}
                key={day}
                onPress={() => {
                  setSelectedDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
                  setReminderMessage('');
                }}
                style={({ pressed }) => [
                  styles.calendarCell,
                  pressed && styles.pressed,
                ]}>
                <View style={[
                  styles.calendarDateCircle,
                  isToday && styles.calendarDateCircleToday,
                  selected && styles.calendarDateCircleSelected,
                ]}>
                  <Text style={[
                    styles.calendarNumberText,
                    isToday && styles.calendarNumberTextToday,
                    selected && styles.calendarNumberTextSelected,
                  ]}>
                    {day}
                  </Text>
                </View>
                <View style={styles.calendarActivityLine}>
                  {activityTotal > 0 ? (
                    <>
                      {entry && entry.sent > 0 ? <View style={styles.calendarSentDot} /> : null}
                      {entry && entry.received > 0 ? <View style={styles.calendarReceivedDot} /> : null}
                      <Text style={styles.calendarActivityCount}>{activityTotal}</Text>
                    </>
                  ) : (
                    <View style={styles.calendarEmptyDot} />
                  )}
                </View>
              </Pressable>
            ) : (
              <View key={`empty-${index}`} style={styles.calendarCell} />
            );
          })}
        </View>
      </View>

      <View style={styles.calendarDetailPanel}>
        <View style={styles.todayHeader}>
          <View style={styles.selectedDateBlock}>
            <Text style={styles.todayDate}>{selectedDay}</Text>
            <View>
              <Text style={styles.todayLabel}>{selectedDateIsToday ? 'Today' : formatSelectedWeekday(selectedDate)}</Text>
              <Text style={styles.todaySubLabel}>{formatSelectedDate(selectedDate)}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all prayer activity for this date"
            style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}>
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.calendarStatsRow}>
          <View style={styles.calendarStatPill}>
            <View style={styles.calendarStatDot} />
            <View style={styles.calendarStatCopy}>
              <Text style={styles.calendarStatValue}>{selectedEntry.sent}</Text>
              <Text style={styles.calendarStatLabel}>Prayers sent</Text>
            </View>
            <Text style={styles.calendarStatMeta}>{selectedTotal} total</Text>
          </View>
          <View style={styles.calendarStatPill}>
            <View style={[styles.calendarStatDot, styles.calendarStatDotAlt]} />
            <View style={styles.calendarStatCopy}>
              <Text style={styles.calendarStatValue}>{selectedEntry.received}</Text>
              <Text style={styles.calendarStatLabel}>Prayers received</Text>
            </View>
            <Text style={styles.calendarStatMeta}>{selectedReminders.length} reminders</Text>
          </View>
        </View>

        <View style={styles.reminderSectionHeader}>
          <Text style={styles.reminderSectionTitle}>Reminder notifications</Text>
          <Text style={styles.reminderSectionText}>
            Optional prompts for {selectedDateIsToday ? 'today' : formatSelectedDate(selectedDate)}.
          </Text>
        </View>

        <View style={styles.reminderTimePanel}>
          <View style={styles.reminderTimeHeader}>
            <Text style={styles.reminderTimeLabel}>Time</Text>
            <Text style={styles.reminderTimeValue}>
              {reminderHour}:{formatReminderMinute(reminderMinute)} {reminderMeridiem}
            </Text>
          </View>
          <View style={styles.reminderDialRow}>
            <MeridiemSelector value={reminderMeridiem} onChange={setReminderMeridiem} />
            <TimeWheelColumn
              accessibilityLabel="Reminder hour"
              currentLabel={`${reminderHour}`}
              nextLabel={`${nextHour}`}
              onStep={(delta) => setReminderHour((current) => wrapReminderHour(current + delta))}
              previousLabel={`${previousHour}`}
            />
            <Text accessible={false} style={styles.reminderDialColon}>:</Text>
            <TimeWheelColumn
              accessibilityLabel="Reminder minute"
              currentLabel={formatReminderMinute(reminderMinute)}
              nextLabel={nextMinute}
              onStep={(delta) => setReminderMinute((current) => wrapReminderMinute(current + delta))}
              previousLabel={previousMinute}
            />
          </View>
        </View>

        {selectedReminders.length > 0 ? (
          selectedReminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={[styles.reminderMarker, !reminder.native && styles.reminderMarkerAlt]} />
              <View style={styles.reminderCopy}>
                <Text style={styles.reminderCardTitle}>Prayer reminder</Text>
                <Text style={styles.reminderCardTime}>
                  {formatReminderTime(reminder.scheduledFor)} - {reminder.native ? 'Phone notification' : 'Preview reminder'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cancel reminder at ${formatReminderTime(reminder.scheduledFor)}`}
                hitSlop={8}
                onPress={() => void removePrayerReminder(reminder)}
                style={({ pressed }) => [styles.reminderCancelButton, pressed && styles.pressed]}>
                <UtilityIcon type="close" size={16} color="#69543a" />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.reminderCard}>
            <View style={styles.reminderMarker} />
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderCardTitle}>No reminders yet</Text>
              <Text style={styles.reminderCardTime}>Set a time below, then add one for this date.</Text>
            </View>
          </View>
        )}
        <View style={styles.reminderActionRow}>
          <Text style={styles.reminderFooter}>
            {reminderFooterText}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add prayer reminder"
            accessibilityState={{ disabled: !canAddReminder }}
            disabled={!canAddReminder}
            onPress={addPrayerReminder}
            style={({ pressed }) => [
              styles.reminderFloatingCta,
              !canAddReminder && styles.reminderFloatingCtaDisabled,
              pressed && canAddReminder && styles.pressed,
            ]}>
            <UtilityIcon type="plus" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7F2',
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 128,
  },
  profileBlock: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 22,
  },
  topBar: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconSpacer: {
    width: 40,
    height: 40,
  },
  headerLogoImage: {
    width: 124,
    height: 38,
  },
  profileHeader: {
    minHeight: 106,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarColumn: {
    position: 'relative',
    width: 104,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarShadow: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    ...profileShadow,
  },
  avatarFrame: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFF1CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBackground: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FCEADE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarSeedling: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    opacity: 0.92,
  },
  avatarBadge: {
    position: 'absolute',
    top: 10,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FF8A5B',
  },
  avatarAddButton: {
    position: 'absolute',
    right: -1,
    bottom: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#F7F7F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    paddingTop: 12,
  },
  profileName: {
    color: '#2a1c13',
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '900',
  },
  profileStatusText: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
  },
  metricRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  metricValue: {
    color: '#2a1c13',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricPill: {
    position: 'relative',
    marginTop: 5,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: '#FFD8D4',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  metricPillStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255, 138, 91, 0.20)',
  },
  metricLabel: {
    color: '#2a1c13',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  segmented: {
    width: '100%',
    minHeight: 36,
    borderRadius: 0,
    backgroundColor: '#FFF8EF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentButtonActive: {
    backgroundColor: 'transparent',
  },
  segmentPressed: {
    backgroundColor: 'rgba(255, 102, 40, 0.08)',
  },
  segmentText: {
    color: '#2a1c13',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#2a1c13',
  },
  segmentIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    backgroundColor: '#FF6628',
  },
  segmentDivider: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.08)',
  },
  tabSection: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    backgroundColor: '#FFF8EF',
  },
  pager: {
    width: '100%',
  },
  pagerPage: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  paperBoard: {
    position: 'relative',
    marginTop: 18,
    overflow: 'visible',
    paddingTop: 8,
    paddingBottom: 18,
    gap: 0,
  },
  paperTopTape: {
    position: 'absolute',
    top: 4,
    left: 44,
    right: 44,
    height: 10,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  paperGrain: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  emptyPrayerBoard: {
    minHeight: 134,
    marginTop: 12,
    borderRadius: 28,
    backgroundColor: '#FFF1CC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyPrayerBoardTitle: {
    color: '#2a1c13',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyPrayerBoardText: {
    marginTop: 8,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  prayerRow: {
    position: 'relative',
    minHeight: 112,
    borderRadius: 26,
    marginTop: 12,
    paddingLeft: 18,
    paddingRight: 18,
    paddingVertical: 13,
    overflow: 'hidden',
  },
  rowTiltLeft: {
    transform: [{ rotate: '-0.18deg' }],
  },
  rowTiltRight: {
    transform: [{ rotate: '0.16deg' }],
  },
  rowSideBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 62,
    backgroundColor: 'rgba(42, 28, 19, 0.08)',
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
  },
  rowContent: {
    position: 'relative',
    zIndex: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rowSource: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  rowTitle: {
    marginTop: 7,
    color: '#2a1c13',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  rowBody: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  rowFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowFooterText: {
    color: '#FF6628',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  rowMood: {
    marginLeft: 'auto',
    color: '#2a1c13',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  forestPanel: {
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    backgroundColor: '#FFF1CC',
    padding: 18,
    overflow: 'hidden',
  },
  forestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  forestTitle: {
    color: '#2a1c13',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  forestSubtitle: {
    marginTop: 5,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  forestBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forestBadgeValue: {
    color: '#FF6628',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  forestBadgeLabel: {
    color: '#69543a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  forestStage: {
    marginTop: 18,
    minHeight: 245,
    borderRadius: 28,
    backgroundColor: '#F6F2EA',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 18,
  },
  forestIsland: {
    minHeight: 170,
    borderRadius: 30,
    backgroundColor: '#E7F3DD',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.05)',
  },
  treeSpot: {
    position: 'absolute',
    alignItems: 'center',
  },
  treeSpotOne: {
    left: '35%',
    top: '8%',
  },
  treeSpotTwo: {
    left: '8%',
    top: '38%',
  },
  treeSpotThree: {
    right: '8%',
    top: '38%',
  },
  treeLabel: {
    marginTop: -4,
    color: '#2a1c13',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  forestNote: {
    marginTop: 16,
    minHeight: 92,
    borderRadius: 5,
    backgroundColor: '#FFD8D4',
    padding: 15,
  },
  forestNoteTitle: {
    color: '#2a1c13',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  forestNoteBody: {
    marginTop: 6,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  calendarStack: {
    marginTop: 18,
    gap: 16,
  },
  calendarPanel: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    overflow: 'hidden',
  },
  calendarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  monthPill: {
    minHeight: 36,
    minWidth: 0,
    borderRadius: 18,
    backgroundColor: '#F7F3EA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  monthGlyph: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 1.8,
    borderColor: '#2a1c13',
    paddingHorizontal: 2,
    paddingTop: 3,
    gap: 2,
  },
  monthGlyphTop: {
    position: 'absolute',
    left: -1,
    right: -1,
    top: 2,
    height: 1.8,
    backgroundColor: '#2a1c13',
  },
  monthGlyphLine: {
    width: '100%',
    height: 1.4,
    borderRadius: 1,
    backgroundColor: '#2a1c13',
  },
  monthGlyphLineShort: {
    width: '65%',
  },
  monthText: {
    color: '#513c25',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  calendarAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F3EA',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNextIcon: {
    transform: [{ rotate: '180deg' }],
  },
  calendarNavText: {
    color: '#2a1c13',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
  },
  calendarWeekdays: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarWeekday: {
    width: `${100 / 7}%`,
    color: '#69543a',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 2,
  },
  calendarDateCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  calendarDateCircleToday: {
    backgroundColor: '#FFF1EA',
    borderColor: 'rgba(255, 102, 40, 0.22)',
  },
  calendarDateCircleSelected: {
    backgroundColor: '#FF6628',
    borderColor: '#FF6628',
  },
  calendarNumberText: {
    color: '#69543a',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  calendarNumberTextToday: {
    color: '#FF6628',
  },
  calendarNumberTextSelected: {
    color: '#FFFFFF',
  },
  calendarActivityLine: {
    minHeight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  calendarActivityCount: {
    color: '#69543a',
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '900',
  },
  calendarSentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF8A5B',
  },
  calendarReceivedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#9DD96F',
  },
  calendarEmptyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  calendarDetailPanel: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
    ...paperShadow,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todayDate: {
    color: '#2a1c13',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  todayLabel: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  todaySubLabel: {
    marginTop: 1,
    color: '#69543a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  todaySummary: {
    color: '#FF6628',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  viewAllButton: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1EA',
  },
  viewAllText: {
    color: '#FF6628',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  calendarStatsRow: {
    marginTop: 14,
    gap: 10,
  },
  calendarStatPill: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 10,
    ...metricPillShadow,
  },
  calendarStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6628',
  },
  calendarStatDotAlt: {
    backgroundColor: '#9DD96F',
  },
  calendarStatCopy: {
    flex: 1,
    minWidth: 0,
  },
  calendarStatValue: {
    color: '#2a1c13',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  calendarStatLabel: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  calendarStatMeta: {
    color: '#FF6628',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  reminderSectionHeader: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 28, 19, 0.08)',
  },
  reminderSectionTitle: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  reminderSectionText: {
    marginTop: 3,
    color: '#69543a',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  reminderTimePanel: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  reminderTimeHeader: {
    minHeight: 28,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTimeLabel: {
    color: '#69543a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reminderTimeValue: {
    color: '#2a1c13',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  reminderDialRow: {
    minHeight: 128,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reminderDialColumn: {
    position: 'relative',
    minWidth: 64,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reminderMeridiemColumn: {
    minWidth: 78,
  },
  reminderDialMeridiem: {
    color: '#FF6628',
    fontSize: 27,
    lineHeight: 38,
  },
  reminderDialMeridiemMuted: {
    fontSize: 22,
    lineHeight: 36,
  },
  reminderWheelTrack: {
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  reminderDialMuted: {
    color: 'rgba(105, 84, 58, 0.28)',
    fontSize: 28,
    lineHeight: 39,
    fontWeight: '900',
  },
  reminderDialSelected: {
    color: '#2a1c13',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
  },
  reminderDialColon: {
    color: '#513c25',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
  },
  reminderCard: {
    minHeight: 62,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    ...metricPillShadow,
  },
  reminderMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#25CED1',
  },
  reminderMarkerAlt: {
    backgroundColor: '#FF6628',
  },
  reminderCopy: {
    flex: 1,
    minWidth: 0,
  },
  reminderCardTitle: {
    color: '#2a1c13',
    fontSize: 14,
    fontWeight: '900',
  },
  reminderCardTime: {
    marginTop: 4,
    color: '#69543a',
    fontSize: 11,
    fontWeight: '800',
  },
  reminderCancelButton: {
    width: 44,
    height: 44,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderActionRow: {
    marginTop: 14,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reminderFloatingCta: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'center',
    ...profileShadow,
  },
  reminderFloatingCtaDisabled: {
    backgroundColor: '#E1D3C5',
    shadowOpacity: 0,
    elevation: 0,
  },
  reminderFooter: {
    flex: 1,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  expandedBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  expandedBackdropPressArea: {
    ...StyleSheet.absoluteFillObject,
  },
  expandedCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 390,
    minHeight: 350,
    maxHeight: '80%',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.10)',
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 28,
    overflow: 'visible',
  },
  expandedDragSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 66,
    zIndex: 8,
  },
  expandedPaperGrain: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.018)',
  },
  expandedAdhesiveBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 62,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(42, 28, 19, 0.046)',
  },
  expandedTopCrease: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.04)',
  },
  expandedBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(42, 28, 19, 0.046)',
  },
  expandedFold: {
    position: 'absolute',
    bottom: 0,
    width: 68,
    height: 68,
    zIndex: 1,
  },
  expandedFoldRight: {
    right: 0,
  },
  expandedFoldLeft: {
    left: 0,
  },
  expandedPinWrap: {
    position: 'absolute',
    top: -9,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 76,
    alignItems: 'center',
  },
  expandedPinImage: {
    width: 76,
    height: 76,
    transform: [{ translateY: -4 }, { rotate: '-5deg' }],
  },
  expandedHeader: {
    position: 'relative',
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  expandedMeta: {
    flex: 1,
    minWidth: 0,
  },
  expandedSource: {
    color: '#69543a',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  expandedMood: {
    marginTop: 2,
    color: '#2a1c13',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  expandedClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedTitle: {
    position: 'relative',
    zIndex: 3,
    marginTop: 20,
    color: '#2a1c13',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  expandedBodyScroll: {
    position: 'relative',
    zIndex: 3,
    marginTop: 14,
    maxHeight: 190,
  },
  expandedBody: {
    color: '#513c25',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '800',
  },
  expandedFooter: {
    position: 'relative',
    zIndex: 3,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  expandedFooterText: {
    color: '#FF6628',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.34)',
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
    marginBottom: Platform.select({ web: 98, default: 18 }),
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    ...profileShadow,
  },
  photoSheet: {
    marginHorizontal: 14,
    marginBottom: Platform.select({ web: 98, default: 18 }),
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    ...profileShadow,
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
    gap: 14,
  },
  settingsTitle: {
    color: '#2a1c13',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
  },
  settingsSubtitle: {
    marginTop: 3,
    color: '#69543a',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  settingsCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#FFF1CC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.05)',
  },
  creditsLabel: {
    color: '#FF6628',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  creditsText: {
    marginTop: 5,
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  creditsIdeaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 28, 19, 0.08)',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  creditsIdeaLabel: {
    color: '#69543a',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  creditsIdeaName: {
    color: '#2a1c13',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  accountInfoCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.06)',
    overflow: 'hidden',
  },
  accountInfoRow: {
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 28, 19, 0.06)',
    justifyContent: 'center',
  },
  accountInfoLabel: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  accountInfoValue: {
    marginTop: 3,
    color: '#2a1c13',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  settingsActionStack: {
    marginTop: 12,
    gap: 8,
  },
  sessionPill: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFF1CC',
    paddingHorizontal: 15,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  sessionPillLabel: {
    color: '#FF6628',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sessionPillValue: {
    marginTop: 2,
    color: '#2a1c13',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  settingsActionRow: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#FFF8F3',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingsActionRowDestructive: {
    backgroundColor: '#FFE8E1',
  },
  settingsActionText: {
    flex: 1,
    minWidth: 0,
  },
  settingsActionLabel: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  settingsActionLabelDestructive: {
    color: '#FF6628',
  },
  settingsActionDetail: {
    marginTop: 2,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  settingsActionArrow: {
    color: '#2a1c13',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  accountDeletionCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.12)',
    padding: 15,
  },
  accountDeletionTitle: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  accountDeletionText: {
    marginTop: 6,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  deleteAccountButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8E1',
    borderRadius: 999,
    marginTop: 12,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  deleteAccountText: {
    color: '#FF6628',
    fontSize: 13,
    fontWeight: '900',
  },
  deletionConfirmRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  keepAccountButton: {
    alignItems: 'center',
    backgroundColor: '#FF6628',
    borderRadius: 999,
    flex: 1.35,
    justifyContent: 'center',
    minHeight: 42,
  },
  keepAccountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  confirmDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(105, 84, 58, 0.22)',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  confirmDeleteText: {
    color: '#69543a',
    fontSize: 13,
    fontWeight: '900',
  },
  cancelDeletionButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    marginTop: 12,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  cancelDeletionText: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledSettingsButton: {
    opacity: 0.55,
  },
  settingsErrorText: {
    color: '#D9472B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  policyPanel: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#FFF8F3',
    padding: 15,
  },
  policyScroll: {
    marginTop: 10,
    maxHeight: 330,
  },
  policyBackButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
  },
  policyBackText: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
  },
  policyTitle: {
    color: '#2a1c13',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 4,
  },
  policySectionTitle: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginTop: 12,
  },
  policyBody: {
    color: '#69543a',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 5,
  },
  authInput: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.08)',
    paddingHorizontal: 14,
    color: '#2a1c13',
    fontSize: 14,
    fontWeight: '800',
  },
  authButtonGrid: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  authButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#FF6628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonSecondary: {
    backgroundColor: '#FFF1CC',
  },
  authSignupSpacer: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  authButtonText: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
  },
  authButtonSecondaryText: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
  },
  authSignupHint: {
    color: '#69543a',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  fullAuthButton: {
    minHeight: 44,
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 40, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullAuthButtonText: {
    color: '#FF6628',
    fontSize: 13,
    fontWeight: '900',
  },
  authProviderRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  providerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: '#FCEADE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerButtonText: {
    color: '#2a1c13',
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.76,
  },
});
