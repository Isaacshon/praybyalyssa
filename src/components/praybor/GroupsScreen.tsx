import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { AnimatedAsset } from '@/components/praybor/AnimatedAsset';
import { BlessiLogo } from '@/components/praybor/BlessiLogo';
import { getMaskingTapeTheme, MaskingTapeSurface } from '@/components/praybor/MaskingTapeSurface';
import { PrayerComposerSheet } from '@/components/praybor/PrayerComposerSheet';
import { PrayerReportModal } from '@/components/praybor/PrayerReportModal';
import { getPostItPinImage, getPostItPinImageForKey } from '@/components/praybor/postItPins';
import {
  getPostItFoldShade,
  getPostItLayerEdgeColor,
  MoodFace,
  PostItCornerFold,
  PrayerCardArt,
  UtilityIcon,
} from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import {
  maskProfanityInText,
  submitPrayerReport,
  type PrayerReportReason,
} from '@/lib/praybor/content-safety';
import { signInWithEmail } from '@/lib/praybor/auth';
import {
  MOODS,
  setPrayerReaction,
  type MoodId,
  type PrayerDraft,
  type PrayerReaction,
  type ReactionType,
} from '@/lib/praybor/domain';
import {
  createPersistedPrayerGroup,
  fetchPersistedPrayerGroups,
  generateInviteCode,
  joinPersistedPrayerGroup,
  type GroupCategory,
  type PersistedPrayerGroup,
} from '@/lib/praybor/prayer-groups';
import {
  createPersistedPrayerCard,
  fetchPersistedPrayerCards,
} from '@/lib/praybor/prayer-posts';
import {
  fetchPersistedPrayerReactions,
  upsertPersistedPrayerReaction,
} from '@/lib/praybor/prayer-reactions';
import { recordTreeGrowthAction } from '@/lib/praybor/growth-state';
import { getCurrentSupabaseUser } from '@/lib/praybor/session';
import type { PrayerCard } from '@/lib/praybor/sample-data';

type PrayerGroup = PersistedPrayerGroup;

type CreateGroupStep = 'setup' | 'code';

const colors = Colors.light;
const groupPostItBackgrounds = [
  '#FFF1CC',
  '#FFD8D4',
  '#DDEDF5',
  '#E7F3DD',
  '#F6A5C4',
  '#B78BDD',
];

const groupCategoryOptions: { id: GroupCategory; label: string }[] = [
  { id: 'church', label: 'Church' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
  { id: 'random', label: 'Random' },
  { id: 'small_group', label: 'Small Group' },
];
const inviteBaseUrl = 'https://blessie.ca/invite';

type ShareInvitePayload = {
  message: string;
  title: string;
  url: string;
};

async function shareInvite({ message, title, url }: ShareInvitePayload) {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: message, url });
        return;
      } catch {
        // Web Share can reject on localhost, unsupported browsers, or user cancel.
      }
    }

    if (await copyInviteToClipboard(message)) {
      showWebInviteMessage('Invite copied', 'The invite message was copied to your clipboard.');
      return;
    }

    showWebInviteMessage('Copy invite', message);
    return;
  }

  try {
    await Share.share({ title, message, url });
  } catch (shareError) {
    Alert.alert(
      'Could not open sharing',
      shareError instanceof Error ? shareError.message : 'Please try again in a moment.',
    );
  }
}

function buildInvitePayload(inviteCode: string) {
  const normalizedCode = inviteCode.trim().replace(/^#/, '');
  const url = `${inviteBaseUrl}/${encodeURIComponent(normalizedCode)}`;
  const message = [
    "Let's pray for one another together.",
    `Invite code: ${normalizedCode}`,
    url,
  ].join('\n');

  return { message, url };
}

async function copyInviteToClipboard(message: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch {
      // Fall through to the textarea fallback for web previews.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = message;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function showWebInviteMessage(title: string, message: string) {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
  }
}

const cardShadow = Platform.select({
  web: { boxShadow: '0 18px 36px rgba(255, 138, 91, 0.14)' },
  default: {
    shadowColor: '#FF8A5B',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
});

const softShadow = Platform.select({
  web: { boxShadow: '0 12px 26px rgba(255, 138, 91, 0.13)' },
  default: {
    shadowColor: '#FF8A5B',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
});

export function GroupsScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string | string[] }>();
  const [selectedGroup, setSelectedGroup] = useState<PrayerGroup | undefined>();
  const [groupList, setGroupList] = useState<PrayerGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupLoadError, setGroupLoadError] = useState('');
  const initialInviteCode = Array.isArray(invite) ? invite[0] : invite;

  useEffect(() => {
    let isMounted = true;

    async function loadGroups() {
      try {
        setGroupLoadError('');
        const groups = await fetchPersistedPrayerGroups();

        if (isMounted) {
          setGroupList(groups);
        }
      } catch (error) {
        if (isMounted) {
          setGroupLoadError(error instanceof Error ? error.message : 'Could not load groups.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
        }
      }
    }

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  function createGroup(group: PrayerGroup) {
    setGroupList((current) => [
      group,
      ...current.filter((item) => item.id !== group.id),
    ]);
    setSelectedGroup(group);
  }

  if (selectedGroup) {
    return <GroupDetailScreen group={selectedGroup} onBack={() => setSelectedGroup(undefined)} />;
  }

  return (
    <GroupListScreen
      groups={groupList}
      isLoading={isLoadingGroups}
      loadError={groupLoadError}
      initialInviteCode={initialInviteCode}
      onCreateGroup={createGroup}
      onSelect={setSelectedGroup}
    />
  );
}

function GroupListScreen({
  groups,
  isLoading,
  initialInviteCode,
  loadError,
  onCreateGroup,
  onSelect,
}: {
  groups: PrayerGroup[];
  isLoading: boolean;
  initialInviteCode?: string;
  loadError: string;
  onCreateGroup: (group: PrayerGroup) => void;
  onSelect: (group: PrayerGroup) => void;
}) {
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinVisible, setJoinVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [createStep, setCreateStep] = useState<CreateGroupStep>('setup');
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState<GroupCategory>('church');
  const [createInviteCode, setCreateInviteCode] = useState(() => generateInviteCode());
  const [createError, setCreateError] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [loginRequiredVisible, setLoginRequiredVisible] = useState(false);
  const [loginRequiredError, setLoginRequiredError] = useState('');

  useEffect(() => {
    if (!initialInviteCode) {
      return;
    }

    setJoinCode(initialInviteCode);
    setJoinVisible(true);
  }, [initialInviteCode]);

  async function submitJoinCode() {
    if (!joinCode.trim()) {
      return;
    }

    try {
      setJoinError('');
      const joinedGroup = await joinPersistedPrayerGroup(joinCode);

      setJoinVisible(false);
      setJoinCode('');
      onCreateGroup(joinedGroup);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to join this group.');
    }
  }

  function startCreateFlow() {
    setCreateName('');
    setCreateCategory('church');
    setCreateInviteCode(generateInviteCode());
    setCreateError('');
    setCreateStep('setup');
    setCreateVisible(true);
  }

  async function openCreateFlow() {
    try {
      setLoginRequiredError('');
      const user = await getCurrentSupabaseUser();

      if (!user || user.is_anonymous) {
        setLoginRequiredVisible(true);
        return;
      }

      startCreateFlow();
    } catch (error) {
      setLoginRequiredError(error instanceof Error ? error.message : 'Please sign in before creating a group.');
      setLoginRequiredVisible(true);
    }
  }

  function closeCreateFlow() {
    setCreateVisible(false);
    setCreateStep('setup');
  }

  async function finishCreateFlow() {
    if (isCreatingGroup) {
      return;
    }

    const trimmedName = createName.trim();
    const groupName = trimmedName || 'New Prayer Group';

    try {
      setIsCreatingGroup(true);
      setCreateError('');
      const user = await getCurrentSupabaseUser();

      if (!user || user.is_anonymous) {
        setCreateVisible(false);
        setLoginRequiredVisible(true);
        return;
      }

      const createdGroup = await createPersistedPrayerGroup({
        name: groupName,
        category: createCategory,
        invitationCode: createInviteCode,
      });

      setCreateVisible(false);
      setCreateStep('setup');
      setCreateName('');
      setCreateCategory('church');
      onCreateGroup(createdGroup);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create this group.');
    } finally {
      setIsCreatingGroup(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listLogoHeader}>
          <BlessiLogo imageStyle={styles.listLogoImage} />
        </View>
        <View style={styles.quickActionStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join a group with invitation code"
            onPress={() => setJoinVisible(true)}
            style={({ pressed }) => [styles.quickActionRow, pressed && styles.pressed]}>
            <View style={styles.quickActionFaceIcon}>
              <MoodFace mood="excitement" size={36} />
            </View>
            <Text style={styles.joinText}>Join with invite code</Text>
            <Text style={styles.chevron}>&gt;</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create prayer group"
            onPress={openCreateFlow}
            style={({ pressed }) => [styles.quickActionRow, styles.createGroupRow, pressed && styles.pressed]}>
            <View style={styles.createIconBubble}>
              <UtilityIcon type="plus" size={31} color="#FF8A5B" />
            </View>
            <Text style={styles.joinText}>Create a group</Text>
            <Text style={styles.chevron}>&gt;</Text>
          </Pressable>
        </View>

        <View style={styles.groupStack}>
          {isLoading ? (
            <GroupStatusCard title="Loading groups" body="Checking your private prayer spaces." />
          ) : loadError ? (
            <GroupStatusCard title="Could not load groups" body={loadError} />
          ) : groups.length === 0 ? (
            <GroupStatusCard title="No groups yet" body="Create a private prayer space or join with an invite code." />
          ) : (
            groups.map((group, index) => (
              <GroupListCard key={group.id} group={group} index={index} onPress={() => onSelect(group)} />
            ))
          )}
        </View>
      </ScrollView>
      <JoinGroupModal
        code={joinCode}
        onChangeCode={setJoinCode}
        onClose={() => setJoinVisible(false)}
        error={joinError}
        onSubmit={submitJoinCode}
        visible={joinVisible}
      />
      <CreateGroupModal
        groupName={createName}
        inviteCode={createInviteCode}
        category={createCategory}
        error={createError}
        isSubmitting={isCreatingGroup}
        onChangeGroupName={setCreateName}
        onChangeCategory={setCreateCategory}
        onClose={closeCreateFlow}
        onDone={finishCreateFlow}
        onNext={() => setCreateStep('code')}
        step={createStep}
        visible={createVisible}
      />
      <GroupLoginRequiredModal
        error={loginRequiredError}
        onAuthenticated={() => {
          setLoginRequiredVisible(false);
          startCreateFlow();
        }}
        onClose={() => setLoginRequiredVisible(false)}
        visible={loginRequiredVisible}
      />
    </SafeAreaView>
  );
}

function GroupListCard({
  group,
  index,
  onPress,
}: {
  group: PrayerGroup;
  index: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name} group`}
      onPress={onPress}
        style={({ pressed }) => [
        styles.groupCard,
        { backgroundColor: index === 0 ? colors.backgroundElement : '#FFF8F3' },
        pressed && styles.pressed,
      ]}>
      <View style={styles.groupCardText}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
        <View style={styles.memberPreviewRow}>
          <MemberStack moods={group.members} size={30} />
          <Text style={styles.groupMeta}>{group.memberCount} members - {group.updatedAgo}</Text>
        </View>
      </View>
      <View style={[styles.groupArtwork, { backgroundColor: group.accent }]}>
        <PrayerCardArt mood={group.members[index % group.members.length]} size={72} variant={index} />
      </View>
    </Pressable>
  );
}

function GroupStatusCard({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.groupStatusCard}>
      <Text style={styles.groupStatusTitle}>{title}</Text>
      <Text style={styles.groupStatusBody}>{body}</Text>
    </View>
  );
}

function JoinGroupModal({
  code,
  error,
  onChangeCode,
  onClose,
  onSubmit,
  visible,
}: {
  code: string;
  error?: string;
  onChangeCode: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  visible: boolean;
}) {
  const canSubmit = code.trim().length > 0;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.joinOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close group join panel" style={styles.joinScrim} onPress={onClose} />
        <SafeAreaView pointerEvents="box-none" style={styles.joinSheetSafe}>
          <View style={styles.joinSheet}>
            <View style={styles.joinInfoCard}>
              <Text style={styles.joinSheetTitle}>Join a group</Text>
              <Text style={styles.joinSheetSubtitle}>Ask a friend for the invite code</Text>
            </View>

            <View style={styles.joinInputShell}>
              <Text style={styles.hashMark}>#</Text>
              <TextInput
                accessibilityLabel="Group invitation code"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardAppearance="dark"
                onChangeText={onChangeCode}
                onSubmitEditing={onSubmit}
                placeholder="abc123"
                placeholderTextColor="rgba(255,255,255,0.16)"
                returnKeyType="join"
                style={styles.joinInput}
                value={code}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                accessibilityLabel="Join group"
                disabled={!canSubmit}
                onPress={onSubmit}
                style={[styles.joinSubmitButton, !canSubmit && styles.joinSubmitDisabled]}>
                <UtilityIcon type="arrowRight" size={33} color="#FFFFFF" />
              </Pressable>
            </View>
            {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function GroupLoginRequiredModal({
  error,
  onAuthenticated,
  onClose,
  visible,
}: {
  error?: string;
  onAuthenticated: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(error ?? '');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage(error ?? '');
    }
  }, [error, visible]);

  async function authenticate() {
    setWorking(true);
    setMessage('');

    try {
      await signInWithEmail({ email: email.trim(), password });
      onAuthenticated();
    } catch (authError) {
      setMessage(authError instanceof Error ? authError.message : 'Unable to sign in.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.joinOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sign in"
          onPress={onClose}
          style={styles.joinScrim}
        />
        <SafeAreaView pointerEvents="box-none" style={styles.joinSheetSafe}>
          <View style={styles.loginSheet}>
            <View style={styles.loginHandle} />
            <Text style={styles.loginTitle}>Sign in to create a group</Text>
            <Text style={styles.loginSubtitle}>Private prayer groups are tied to your account so members can see the same space later.</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="rgba(42, 28, 19, 0.42)"
              style={styles.loginInput}
              textContentType="emailAddress"
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="rgba(42, 28, 19, 0.42)"
              secureTextEntry
              style={styles.loginInput}
              textContentType="password"
              value={password}
            />
            <View style={styles.loginActionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={() => authenticate()}
                style={({ pressed }) => [styles.loginPrimaryButton, pressed && styles.pressed, working && styles.disabledLinkButton]}>
                <Text style={styles.loginPrimaryText}>{working ? 'Signing in...' : 'Sign in'}</Text>
              </Pressable>
              <View style={styles.loginSecondaryInfo}>
                <Text style={styles.loginSecondaryInfoText}>Create an account from the welcome sign-in screen.</Text>
              </View>
            </View>
            {message ? <Text style={styles.modalErrorText}>{message}</Text> : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CreateGroupModal({
  category,
  error,
  groupName,
  inviteCode,
  isSubmitting,
  onChangeCategory,
  onChangeGroupName,
  onClose,
  onDone,
  onNext,
  step,
  visible,
}: {
  category: GroupCategory;
  error?: string;
  groupName: string;
  inviteCode: string;
  isSubmitting?: boolean;
  onChangeCategory: (value: GroupCategory) => void;
  onChangeGroupName: (value: string) => void;
  onClose: () => void;
  onDone: () => void | Promise<void>;
  onNext: () => void;
  step: CreateGroupStep;
  visible: boolean;
}) {
  const displayName = groupName.trim() || 'New Prayer Group';
  const { message: inviteMessage, url: inviteLink } = buildInvitePayload(inviteCode);

  async function shareInvitation() {
    await shareInvite({
      title: `${displayName} Blessie invite`,
      message: inviteMessage,
      url: inviteLink,
    });
  }

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.createFlowSafe}>
        <View style={styles.createTopBar}>
          {step === 'setup' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close group creation"
              onPress={onClose}
              style={[styles.createCircleButton, styles.createLeftAction]}>
              <UtilityIcon type="close" size={29} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <View pointerEvents="none" style={styles.createLogoCenter}>
            <BlessiLogo imageStyle={styles.createLogoImage} />
          </View>
          {step === 'setup' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show invitation code"
              onPress={onNext}
              style={[styles.createConfirmButton, styles.createRightAction]}>
              <UtilityIcon type="check" size={34} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        {step === 'setup' ? (
          <ScrollView contentContainerStyle={styles.createSetupContent} showsVerticalScrollIndicator={false}>
            <View style={styles.createTitleRow}>
              <Text style={styles.createArrow}>-&gt;</Text>
              <Text style={styles.createTitle}>Create group</Text>
            </View>

            <TextInput
              accessibilityLabel="Group name optional"
              autoCorrect={false}
              onChangeText={onChangeGroupName}
              placeholder="Group name (optional)"
              placeholderTextColor="rgba(27, 51, 40, 0.40)"
              style={styles.createNameInput}
              value={groupName}
            />

            <View style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>Choose category</Text>
              <View style={styles.categoryGrid}>
                {groupCategoryOptions.map((option) => {
                  const selected = option.id === category;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.label} group category`}
                      onPress={() => onChangeCategory(option.id)}
                      style={[styles.categoryOption, selected && styles.categoryOptionSelected]}>
                      <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.createCodeContent}>
            <Text style={styles.codeTitle}>{displayName} :)</Text>
            <Text style={styles.inviteCodeText}># {inviteCode}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Invite friends" onPress={shareInvitation} style={styles.codeLinkButton}>
              <Text style={styles.codeLinkText}>Invite friends -&gt;</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish group creation"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={onDone}
              style={[styles.codeLinkButton, isSubmitting && styles.disabledLinkButton]}>
              <Text style={styles.codeLinkText}>{isSubmitting ? 'Saving...' : 'Done ->'}</Text>
            </Pressable>
            {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function GroupDetailScreen({ group, onBack }: { group: PrayerGroup; onBack: () => void }) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [posts, setPosts] = useState<PrayerCard[]>(group.posts);
  const [reactions, setReactions] = useState<PrayerReaction[]>([]);
  const [reportedPost, setReportedPost] = useState<PrayerCard | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchPersistedPrayerCards('group', group.id).then(async (nextPosts) => {
      const nextReactions = await fetchPersistedPrayerReactions(nextPosts.map((post) => post.id));

      if (isMounted) {
        setPosts(nextPosts.map((post) => ({ ...post, groupName: group.name })));
        setReactions(nextReactions);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [group.id, group.name]);

  async function createGroupPost(draft: PrayerDraft) {
    const createdPost = await createPersistedPrayerCard({
      ...draft,
      visibility: 'group',
      groupId: group.id,
    });

    setPosts((current) => [
      { ...createdPost, groupName: group.name },
      ...current.filter((post) => post.id !== createdPost.id),
    ]);
    recordTreeGrowthAction('prayer_posted', 'group', undefined, createdPost.id);
  }

  async function reactToPrayer(prayerId: string, type: ReactionType) {
    setReactions((current) =>
      setPrayerReaction(current, {
        prayerId,
        userId: 'current-user',
        type,
      }),
    );

    try {
      const persistedReaction = await upsertPersistedPrayerReaction(prayerId, type);

      setReactions((current) =>
        setPrayerReaction(
          current.filter((reaction) => !(reaction.prayerId === prayerId && reaction.userId === 'current-user')),
          persistedReaction,
        ),
      );
      recordTreeGrowthAction('reaction_given', 'group', undefined, prayerId);
    } catch (error) {
      console.warn('Could not save group prayer reaction to Supabase.', error);
    }
  }

  async function reportGroupPrayer({
    blockAuthor,
    details,
    reason,
  }: {
    blockAuthor: boolean;
    details: string;
    reason: PrayerReportReason;
  }) {
    if (!reportedPost) {
      return;
    }

    await submitPrayerReport({
      blockAuthor,
      details,
      prayerId: reportedPost.id,
      reason,
      reportedAuthorId: reportedPost.authorId,
    });

    setPosts((current) =>
      current.filter((post) => {
        if (post.id === reportedPost.id) {
          return false;
        }

        return !blockAuthor || !reportedPost.authorId || post.authorId !== reportedPost.authorId;
      }),
    );
  }

  async function shareGroupInvite() {
    const inviteCode = group.invitationCode;
    const { message: inviteMessage, url: inviteLink } = buildInvitePayload(inviteCode);

    await shareInvite({
      title: `${group.name} Blessie invite`,
      message: inviteMessage,
      url: inviteLink,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to group list" onPress={onBack} style={styles.detailCircle}>
          <UtilityIcon type="back" size={25} />
        </Pressable>
        <View style={styles.memberPill}>
          <BlessiLogo imageStyle={styles.detailLogoImage} />
        </View>
        <View style={styles.detailHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share group invite"
            onPress={shareGroupInvite}
            style={styles.detailCircleSmall}>
            <UtilityIcon type="share" size={24} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post prayer"
            onPress={() => setComposerVisible(true)}
            style={styles.detailCirclePost}>
            <UtilityIcon type="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <View style={styles.groupHero}>
          <View style={styles.groupHeroCopy}>
            <Text style={styles.groupHeroTitle}>{group.name}</Text>
            <Text style={styles.groupHeroText}>{group.rhythm}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeCount}>{posts.length}</Text>
            <Text style={styles.heroBadgeLabel}>Prayers</Text>
          </View>
        </View>

        {posts.map((post, index) => (
          <GroupPrayerNote
            key={post.id}
            index={index}
            post={post}
            reactions={reactions.filter((reaction) => reaction.prayerId === post.id)}
            onReact={(type) => reactToPrayer(post.id, type)}
            onReport={() => setReportedPost(post)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Invite friend to group"
          onPress={shareGroupInvite}
          style={styles.inviteCard}>
          <UtilityIcon type="plus" size={36} color="#FF8A5B" />
          <Text style={styles.inviteText}>Invite friends</Text>
        </Pressable>
      </ScrollView>

      <PrayerComposerSheet
        visible={composerVisible}
        defaultVisibility="group"
        groupId={group.id}
        onClose={() => setComposerVisible(false)}
        onCreate={createGroupPost}
      />

      <PrayerReportModal
        authorLabel={reportedPost?.authorLabel}
        canBlockAuthor={Boolean(reportedPost?.authorId)}
        onClose={() => setReportedPost(null)}
        onSubmit={reportGroupPrayer}
        prayerTitle={reportedPost?.title}
        visible={Boolean(reportedPost)}
      />
    </SafeAreaView>
  );
}

function GroupPrayerNote({
  index,
  onReact,
  onReport,
  post,
  reactions,
}: {
  index: number;
  onReact: (type: ReactionType) => void;
  onReport: () => void;
  post: PrayerCard;
  reactions: PrayerReaction[];
}) {
  const mood = MOODS.find((option) => option.id === post.mood) ?? MOODS[0];
  const rotations = ['-1.5deg', '1deg', '-0.6deg', '0.8deg'];
  const paperColor = post.paperColor ?? groupPostItBackgrounds[index % groupPostItBackgrounds.length];
  const foldShade = getPostItFoldShade(paperColor);
  const foldSide = index % 2 === 0 ? 'right' : 'left';
  const reactionTapeTheme = getMaskingTapeTheme(post.id, paperColor, 'group-reaction');
  const pinImage =
    typeof post.pinSeed === 'number'
      ? getPostItPinImage(post.pinSeed)
      : getPostItPinImageForKey(post.id);
  const prayerCount = reactions.filter((item) => item.type === 'prayer').length;

  return (
    <View
      style={[
        styles.prayerNote,
        {
          backgroundColor: paperColor,
          borderColor: getPostItLayerEdgeColor(paperColor, 0.3),
          transform: [{ rotate: rotations[index % rotations.length] }],
        },
      ]}>
      <View pointerEvents="none" style={styles.noteFloatingShadow} />
      <View pointerEvents="none" style={styles.notePaperGrain} />
      <View pointerEvents="none" style={styles.noteAdhesiveBand} />
      <View pointerEvents="none" style={styles.noteSurfaceWash} />
      <View pointerEvents="none" style={styles.notePaperFiberTop} />
      <View pointerEvents="none" style={styles.noteTopCrease} />
      <View pointerEvents="none" style={styles.noteLeftLift} />
      <View pointerEvents="none" style={styles.noteEdgeShade} />
      <View pointerEvents="none" style={styles.noteBottomShade} />
      <View
        pointerEvents="none"
        style={[
          styles.noteFoldShadow,
          { backgroundColor: foldShade },
          foldSide === 'right' ? styles.noteFoldShadowRight : styles.noteFoldShadowLeft,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.noteFold,
          foldSide === 'right' ? styles.noteFoldRight : styles.noteFoldLeft,
        ]}>
        <PostItCornerFold color={paperColor} side={foldSide} size={52} />
      </View>
      <View pointerEvents="none" style={styles.groupNotePinWrap}>
        <View
          style={[
            styles.groupNotePinShell,
            index % 2 === 0 ? styles.groupNotePinTiltLeft : styles.groupNotePinTiltRight,
          ]}>
          <Image source={pinImage} resizeMode="contain" style={styles.groupNotePinImage} />
        </View>
      </View>
      <View style={styles.noteHeader}>
        <MoodFace mood={post.mood} size={44} />
        <View style={styles.noteAuthorBlock}>
          <Text style={styles.noteAuthor}>{post.authorLabel}</Text>
          <Text style={styles.noteMeta}>{post.postedAgo} - {mood.label}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report this prayer"
          hitSlop={8}
          onPress={onReport}
          style={styles.noteReportButton}>
          <UtilityIcon type="siren" size={18} color="#FF6628" />
        </Pressable>
      </View>
      <Text style={styles.noteTitle}>{maskProfanityInText(post.title)}</Text>
      <Text style={styles.noteBodyText}>{maskProfanityInText(post.body)}</Text>
      <View style={styles.noteFooterSpacer} />
      <View style={styles.noteFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`I prayed for you, ${prayerCount} prayer${prayerCount === 1 ? '' : 's'}`}
          onPress={() => onReact('prayer')}
          style={({ pressed }) => [
            styles.notePrayedButton,
            {
              backgroundColor: reactionTapeTheme.backgroundColor,
              borderColor: reactionTapeTheme.borderColor,
            },
            pressed && styles.pressed,
          ]}>
          <MaskingTapeSurface theme={reactionTapeTheme} tearColor={paperColor} />
          <View style={styles.notePrayedIcon}>
            <AnimatedAsset assetKey="reaction_prayer" size={28} />
          </View>
          <Text style={styles.notePrayedLabel}>I prayed for you</Text>
          <View style={styles.notePrayedCountPill}>
            <Text style={styles.notePrayedCount}>{prayerCount}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function MemberStack({ moods, size }: { moods: MoodId[]; size: number }) {
  return (
    <View style={styles.memberStack}>
      {moods.slice(0, 4).map((mood, index) => (
        <View
          key={`${mood}-${index}`}
          style={[
            styles.memberBubble,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: index === 0 ? 0 : -8,
            },
          ]}>
          <MoodFace mood={mood} size={size - 4} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    minHeight: '100%',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: Platform.select({ web: 126, default: 40 }),
  },
  listLogoHeader: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  listLogoImage: {
    width: 124,
    height: 38,
  },
  listHeader: {
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    color: colors.tint,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  bigTitle: {
    color: colors.text,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  profileOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF1EA',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  quickActionStack: {
    gap: 0,
    marginBottom: 10,
  },
  quickActionRow: {
    minHeight: 60,
    borderRadius: 24,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...softShadow,
  },
  createGroupRow: {
    backgroundColor: '#FFF6F0',
    marginTop: -4,
  },
  quickActionFaceIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 1 }],
  },
  createIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  chevron: {
    color: colors.accent,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
  },
  groupStack: {
    gap: 16,
  },
  groupStatusCard: {
    minHeight: 132,
    borderRadius: 28,
    backgroundColor: '#FFF8F3',
    padding: 22,
    justifyContent: 'center',
    ...softShadow,
  },
  groupStatusTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  groupStatusBody: {
    marginTop: 8,
    color: colors.textTertiary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  groupCard: {
    minHeight: 158,
    borderRadius: 32,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    ...cardShadow,
  },
  groupCardText: {
    flex: 1,
  },
  groupName: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  groupSubtitle: {
    marginTop: 8,
    color: colors.textTertiary,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  memberPreviewRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupMeta: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '900',
  },
  groupArtwork: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.76)',
  },
  joinScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  joinSheetSafe: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  joinSheet: {
    paddingHorizontal: 28,
    paddingBottom: Platform.select({ web: 104, default: 34 }),
    gap: 14,
  },
  loginSheet: {
    marginHorizontal: 20,
    marginBottom: Platform.select({ web: 104, default: 28 }),
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 22,
    gap: 12,
    ...softShadow,
  },
  loginHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8DED7',
    marginBottom: 8,
  },
  loginTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  loginSubtitle: {
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  loginInput: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#FFF8F3',
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  loginActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  loginPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  loginPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  loginSecondaryInfo: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#FFF1CC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  loginSecondaryInfoText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  joinInfoCard: {
    minHeight: 86,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(42, 28, 19, 0.88)',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  joinSheetTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  joinSheetSubtitle: {
    marginTop: 3,
    color: '#FF8A5B',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  joinInputShell: {
    minHeight: 96,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#2a1c13',
    paddingLeft: 26,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hashMark: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  joinInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    color: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  joinSubmitButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  joinSubmitDisabled: {
    backgroundColor: '#D96E4E',
  },
  createFlowSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  createTopBar: {
    minHeight: 88,
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  createLogoCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCircleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2a1c13',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  createLeftAction: {
    position: 'absolute',
    left: 24,
    top: 19,
    zIndex: 2,
  },
  createConfirmButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  createRightAction: {
    position: 'absolute',
    right: 24,
    top: 16,
    zIndex: 2,
  },
  createLogoImage: {
    width: 124,
    height: 38,
  },
  createSetupContent: {
    paddingHorizontal: 30,
    paddingTop: 42,
    paddingBottom: 80,
  },
  createTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 46,
  },
  createArrow: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
  },
  createTitle: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
  },
  createNameInput: {
    minHeight: 56,
    marginBottom: 54,
    color: colors.text,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
  },
  categorySection: {
    gap: 22,
  },
  categorySectionTitle: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  categoryOption: {
    width: '48%',
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(42, 28, 19, 0.24)',
    backgroundColor: '#FFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  categoryOptionSelected: {
    borderColor: '#FF8A5B',
    backgroundColor: '#FF8A5B',
  },
  categoryOptionText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: colors.text,
  },
  createCodeContent: {
    flex: 1,
    paddingHorizontal: 44,
    paddingTop: 58,
  },
  codeTitle: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 35,
    fontWeight: '900',
    marginBottom: 58,
  },
  inviteCodeText: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 39,
    fontWeight: '800',
    marginBottom: 58,
  },
  codeLinkButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginBottom: 34,
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },
  codeLinkText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
  },
  disabledLinkButton: {
    opacity: 0.5,
  },
  modalErrorText: {
    color: '#D43D3D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  detailHeader: {
    minHeight: 96,
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  detailHeaderActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  detailCircleSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  detailCirclePost: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  memberPill: {
    position: 'absolute',
    left: '50%',
    top: 18,
    width: 130,
    minHeight: 58,
    marginLeft: -65,
    borderRadius: 29,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...softShadow,
  },
  detailLogoImage: {
    width: 94,
    height: 30,
  },
  detailContent: {
    paddingHorizontal: 18,
    paddingBottom: Platform.select({ web: 190, default: 112 }),
    gap: 34,
  },
  groupHero: {
    minHeight: 132,
    borderRadius: 32,
    padding: 22,
    backgroundColor: '#FFF1EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    ...cardShadow,
  },
  groupHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  groupHeroTitle: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  groupHeroText: {
    marginTop: 8,
    color: colors.textTertiary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeCount: {
    color: colors.accent,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  heroBadgeLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '900',
  },
  prayerNote: {
    minHeight: 394,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 26,
    paddingTop: 36,
    overflow: 'visible',
    flexGrow: 1,
    ...cardShadow,
  },
  noteFloatingShadow: {
    position: 'absolute',
    left: 22,
    right: 16,
    bottom: -17,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 28, 19, 0.18)',
    opacity: 0.25,
    transform: [{ scaleY: 0.34 }, { rotate: '-1deg' }],
  },
  groupNotePinWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    zIndex: 4,
    height: 52,
    alignItems: 'center',
  },
  groupNotePinShell: {
    width: 54,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNotePinImage: {
    width: 82,
    height: 82,
  },
  groupNotePinTiltLeft: {
    transform: [{ rotate: '-5deg' }],
  },
  groupNotePinTiltRight: {
    transform: [{ rotate: '6deg' }],
  },
  notePaperGrain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  noteAdhesiveBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 42,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(42, 28, 19, 0.052)',
  },
  noteSurfaceWash: {
    position: 'absolute',
    top: 58,
    left: 16,
    right: 16,
    bottom: 42,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    opacity: 0.74,
    transform: [{ rotate: '-1.5deg' }],
  },
  notePaperFiberTop: {
    position: 'absolute',
    top: 41,
    left: 0,
    right: 0,
    height: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    opacity: 0.86,
  },
  noteTopCrease: {
    position: 'absolute',
    top: 41,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.055)',
  },
  noteEdgeShade: {
    position: 'absolute',
    top: 42,
    right: 0,
    bottom: 14,
    width: 26,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(42, 28, 19, 0.045)',
  },
  noteLeftLift: {
    position: 'absolute',
    top: 48,
    left: 0,
    bottom: 22,
    width: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  noteBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(42, 28, 19, 0.048)',
  },
  noteFoldShadow: {
    position: 'absolute',
    bottom: -4,
    width: 52,
    height: 52,
    backgroundColor: 'rgba(42, 28, 19, 0.16)',
    opacity: 0.2,
    transform: [{ skewX: '-12deg' }],
  },
  noteFold: {
    position: 'absolute',
    bottom: 0,
    width: 52,
    height: 52,
    zIndex: 1,
  },
  noteFoldRight: {
    right: 0,
  },
  noteFoldLeft: {
    left: 0,
  },
  noteFoldShadowRight: {
    right: 2,
  },
  noteFoldShadowLeft: {
    left: 2,
    transform: [{ skewX: '12deg' }],
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  noteAuthorBlock: {
    flex: 1,
  },
  noteReportButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderColor: 'rgba(255, 102, 40, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  noteAuthor: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  noteMeta: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  noteTitle: {
    marginTop: 22,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    zIndex: 2,
  },
  noteBodyText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    zIndex: 2,
  },
  noteFooterSpacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  noteFooter: {
    marginTop: 0,
    marginHorizontal: -10,
    zIndex: 2,
  },
  notePrayedButton: {
    minHeight: 60,
    width: '100%',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'rgba(255, 102, 40, 0.26)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 220, 202, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
    transform: [{ rotate: '-0.7deg' }],
  },
  notePrayedIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 138, 91, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  notePrayedLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    zIndex: 2,
  },
  notePrayedCountPill: {
    minWidth: 38,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  notePrayedCount: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  inviteCard: {
    minHeight: 198,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    ...cardShadow,
  },
  inviteText: {
    color: colors.text,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
  },
  memberStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.76,
  },
});
