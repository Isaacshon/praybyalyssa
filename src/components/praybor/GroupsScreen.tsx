import React, { useMemo, useState } from 'react';
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

import { AnimatedAsset } from '@/components/praybor/AnimatedAsset';
import { PrayerComposerSheet } from '@/components/praybor/PrayerComposerSheet';
import { getPostItPinImage, getPostItPinImageForKey } from '@/components/praybor/postItPins';
import {
  getPostItFoldShade,
  getPostItLayerEdgeColor,
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
  type MoodId,
  type PrayerDraft,
  type PrayerReaction,
  type ReactionType,
} from '@/lib/praybor/domain';
import { groupPrayerCards, initialReactions, type PrayerCard } from '@/lib/praybor/sample-data';
import { buildSituationPrayer } from '@/lib/praybor/situation-prompts';

type PrayerGroup = {
  id: string;
  name: string;
  subtitle: string;
  rhythm: string;
  updatedAgo: string;
  memberCount: number;
  accent: string;
  members: MoodId[];
  posts: PrayerCard[];
};

type CreateGroupStep = 'setup' | 'code';
type GroupCategory = 'church' | 'friends' | 'family' | 'random' | 'small_group';

const colors = Colors.light;
const reactionLabels: { type: ReactionType; label: string }[] = [
  { type: 'prayer', label: 'Prayer' },
  { type: 'amen', label: 'Amen' },
  { type: 'comfort', label: 'Comfort' },
  { type: 'love', label: 'Love' },
];
const youthTravelPrayer = buildSituationPrayer(['protection', 'time_pressure']);
const youthWelcomePrayer = buildSituationPrayer(['church_community', 'relationship_closeness']);
const morningPeacePrayer = buildSituationPrayer(['anxiety', 'guidance']);
const groupPostItBackgrounds = [
  '#FFF1CC',
  '#FFD8D4',
  '#DDEDF5',
  '#E7F3DD',
  '#F6A5C4',
  '#B78BDD',
];

const initialGroups: PrayerGroup[] = [
  {
    id: 'friday-house',
    name: 'Friday House Church',
    subtitle: '3 prayer requests from members',
    rhythm: 'Friday evening prayer rhythm',
    updatedAgo: '8 min ago',
    memberCount: 12,
    accent: '#FFD8D4',
    members: ['joy', 'sad', 'surprised', 'gratitude'],
    posts: groupPrayerCards,
  },
  {
    id: 'youth-retreat',
    name: 'Youth Retreat Team',
    subtitle: '4 retreat prep prayers',
    rhythm: 'Daily 10 PM check-in',
    updatedAgo: 'This morning',
    memberCount: 8,
    accent: '#DDEDF5',
    members: ['excitement', 'ordinary', 'afraid', 'joy'],
    posts: [
      {
        ...groupPrayerCards[0],
        ...youthTravelPrayer,
        id: 'team-1',
        mood: 'ordinary',
        groupName: 'Youth Retreat Team',
        postedAgo: '21m',
      },
      {
        ...groupPrayerCards[1],
        ...youthWelcomePrayer,
        id: 'team-2',
        mood: 'afraid',
        groupName: 'Youth Retreat Team',
        postedAgo: '1h',
      },
    ],
  },
  {
    id: 'morning-prayer',
    name: 'Morning Prayer',
    subtitle: '2 morning prayer rhythms',
    rhythm: 'Daily at 7 AM',
    updatedAgo: 'Yesterday',
    memberCount: 5,
    accent: '#E7F3DD',
    members: ['gratitude', 'joy', 'ordinary'],
    posts: [
      {
        ...groupPrayerCards[2],
        ...morningPeacePrayer,
        id: 'morning-1',
        mood: 'gratitude',
        groupName: 'Morning Prayer',
        postedAgo: '2h',
      },
    ],
  },
];

const groupCategoryOptions: { id: GroupCategory; label: string }[] = [
  { id: 'church', label: 'Church' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
  { id: 'random', label: 'Random' },
  { id: 'small_group', label: 'Small Group' },
];
const newGroupInviteCode = 'ccqnw01';
const inviteBaseUrl = 'https://praybor.app/join';

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
  const [selectedGroup, setSelectedGroup] = useState<PrayerGroup | undefined>();
  const [groupList, setGroupList] = useState<PrayerGroup[]>(initialGroups);

  function createGroup(group: PrayerGroup) {
    setGroupList((current) => [group, ...current]);
    setSelectedGroup(group);
  }

  if (selectedGroup) {
    return <GroupDetailScreen group={selectedGroup} onBack={() => setSelectedGroup(undefined)} />;
  }

  return <GroupListScreen groups={groupList} onCreateGroup={createGroup} onSelect={setSelectedGroup} />;
}

function GroupListScreen({
  groups,
  onCreateGroup,
  onSelect,
}: {
  groups: PrayerGroup[];
  onCreateGroup: (group: PrayerGroup) => void;
  onSelect: (group: PrayerGroup) => void;
}) {
  const [joinCode, setJoinCode] = useState('');
  const [joinVisible, setJoinVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [createStep, setCreateStep] = useState<CreateGroupStep>('setup');
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState<GroupCategory>('church');

  function submitJoinCode() {
    if (!joinCode.trim()) {
      return;
    }

    setJoinVisible(false);
    setJoinCode('');
    onSelect(groups[0]);
  }

  function openCreateFlow() {
    setCreateName('');
    setCreateCategory('church');
    setCreateStep('setup');
    setCreateVisible(true);
  }

  function closeCreateFlow() {
    setCreateVisible(false);
    setCreateStep('setup');
  }

  function finishCreateFlow() {
    const trimmedName = createName.trim();
    const groupName = trimmedName || 'New Prayer Group';
    const categoryLabel =
      groupCategoryOptions.find((category) => category.id === createCategory)?.label ?? 'Church';

    setCreateVisible(false);
    setCreateStep('setup');
    setCreateName('');
    setCreateCategory('church');
    onCreateGroup({
      id: `created-${Date.now()}`,
      name: groupName,
      subtitle: `${categoryLabel} prayer group`,
      rhythm: `Invite code #${newGroupInviteCode}`,
      updatedAgo: 'Created now',
      memberCount: 1,
      accent: '#DDEDF5',
      members: ['gratitude', 'joy', 'ordinary', 'excitement'],
      posts: [],
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActionStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join a group with invitation code"
            onPress={() => setJoinVisible(true)}
            style={({ pressed }) => [styles.quickActionRow, pressed && styles.pressed]}>
            <MoodFace mood="excitement" size={40} />
            <Text style={styles.joinText}>Join with invite code</Text>
            <Text style={styles.chevron}>&gt;</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create prayer group"
            onPress={openCreateFlow}
            style={({ pressed }) => [styles.quickActionRow, styles.createGroupRow, pressed && styles.pressed]}>
            <View style={styles.createIconBubble}>
              <UtilityIcon type="plus" size={25} color="#FF8A5B" />
            </View>
            <Text style={styles.joinText}>Create a group</Text>
            <Text style={styles.chevron}>&gt;</Text>
          </Pressable>
        </View>

        <View style={styles.groupStack}>
          {groups.map((group, index) => (
            <GroupListCard key={group.id} group={group} index={index} onPress={() => onSelect(group)} />
          ))}
        </View>
      </ScrollView>
      <JoinGroupModal
        code={joinCode}
        onChangeCode={setJoinCode}
        onClose={() => setJoinVisible(false)}
        onSubmit={submitJoinCode}
        visible={joinVisible}
      />
      <CreateGroupModal
        groupName={createName}
        inviteCode={newGroupInviteCode}
        category={createCategory}
        onChangeGroupName={setCreateName}
        onChangeCategory={setCreateCategory}
        onClose={closeCreateFlow}
        onDone={finishCreateFlow}
        onNext={() => setCreateStep('code')}
        step={createStep}
        visible={createVisible}
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

function JoinGroupModal({
  code,
  onChangeCode,
  onClose,
  onSubmit,
  visible,
}: {
  code: string;
  onChangeCode: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
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
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CreateGroupModal({
  category,
  groupName,
  inviteCode,
  onChangeCategory,
  onChangeGroupName,
  onClose,
  onDone,
  onNext,
  step,
  visible,
}: {
  category: GroupCategory;
  groupName: string;
  inviteCode: string;
  onChangeCategory: (value: GroupCategory) => void;
  onChangeGroupName: (value: string) => void;
  onClose: () => void;
  onDone: () => void;
  onNext: () => void;
  step: CreateGroupStep;
  visible: boolean;
}) {
  const displayName = groupName.trim() || 'New Prayer Group';
  const inviteLink = `${inviteBaseUrl}?code=${encodeURIComponent(inviteCode)}`;
  const inviteMessage = [
    `You are invited to "${displayName}" on PrayBor.`,
    'Share prayer requests and pray for one another in a private group.',
    `Invite code: #${inviteCode}`,
    `Join link: ${inviteLink}`,
  ].join('\n');

  async function shareInvitation() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${displayName} PrayBor invite`,
          text: inviteMessage,
          url: inviteLink,
        });
        return;
      }

      await Share.share({
        title: `${displayName} PrayBor invite`,
        message: inviteMessage,
        url: inviteLink,
      });
    } catch (shareError) {
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

      if (clipboard?.writeText) {
        await clipboard.writeText(inviteMessage);
        Alert.alert('Invite copied', 'Sharing was not available, so the invite message was copied to your clipboard.');
        return;
      }

      Alert.alert(
        'Could not open sharing',
        shareError instanceof Error ? shareError.message : 'Please try again in a moment.',
      );
    }
  }

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.createFlowSafe}>
        <View style={styles.createTopBar}>
          {step === 'setup' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Close group creation" onPress={onClose} style={styles.createCircleButton}>
              <UtilityIcon type="close" size={29} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.createTopSpacer} />
          )}
          <Text style={styles.createBrand}>PrayBor</Text>
          {step === 'setup' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Show invitation code" onPress={onNext} style={styles.createConfirmButton}>
              <UtilityIcon type="check" size={34} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.createTopSpacer} />
          )}
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
            <Pressable accessibilityRole="button" accessibilityLabel="Finish group creation" onPress={onDone} style={styles.codeLinkButton}>
              <Text style={styles.codeLinkText}>Done -&gt;</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function GroupDetailScreen({ group, onBack }: { group: PrayerGroup; onBack: () => void }) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [localPosts, setLocalPosts] = useState<PrayerCard[]>([]);
  const [reactions, setReactions] = useState<PrayerReaction[]>(initialReactions);
  const posts = useMemo(() => [...localPosts, ...group.posts], [group.posts, localPosts]);

  function createLocalPost(draft: PrayerDraft) {
    setLocalPosts((current) => [
      {
        id: `group-local-${Date.now()}`,
        title: draft.title,
        body: draft.body,
        mood: draft.mood,
        visibility: 'group',
        identity: draft.identity,
        authorLabel: draft.identity === 'anonymous' ? 'Group member' : 'You',
        groupName: group.name,
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

  async function shareGroupInvite() {
    const inviteLink = `${inviteBaseUrl}?code=${encodeURIComponent(newGroupInviteCode)}`;
    const inviteMessage = [
      `You are invited to "${group.name}" on PrayBor.`,
      'Share prayer requests and pray for one another in a private group.',
      `Invite code: #${newGroupInviteCode}`,
      `Join link: ${inviteLink}`,
    ].join('\n');

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${group.name} PrayBor invite`,
          text: inviteMessage,
          url: inviteLink,
        });
        return;
      }

      await Share.share({
        title: `${group.name} PrayBor invite`,
        message: inviteMessage,
        url: inviteLink,
      });
    } catch (shareError) {
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

      if (clipboard?.writeText) {
        await clipboard.writeText(inviteMessage);
        Alert.alert('Invite copied', 'Sharing was not available, so the invite message was copied to your clipboard.');
        return;
      }

      Alert.alert(
        'Could not open sharing',
        shareError instanceof Error ? shareError.message : 'Please try again in a moment.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to group list" onPress={onBack} style={styles.detailCircle}>
          <UtilityIcon type="back" size={25} />
        </Pressable>
        <View style={styles.memberPill}>
          <MemberStack moods={group.members} size={30} />
          <UtilityIcon type="chevronDown" size={24} />
        </View>
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
        onClose={() => setComposerVisible(false)}
        onCreate={createLocalPost}
      />
    </SafeAreaView>
  );
}

function GroupPrayerNote({
  index,
  onReact,
  post,
  reactions,
}: {
  index: number;
  onReact: (type: ReactionType) => void;
  post: PrayerCard;
  reactions: PrayerReaction[];
}) {
  const mood = MOODS.find((option) => option.id === post.mood) ?? MOODS[0];
  const rotations = ['-1.5deg', '1deg', '-0.6deg', '0.8deg'];
  const paperColor = post.paperColor ?? groupPostItBackgrounds[index % groupPostItBackgrounds.length];
  const foldShade = getPostItFoldShade(paperColor);
  const foldSide = index % 2 === 0 ? 'right' : 'left';
  const pinImage =
    typeof post.pinSeed === 'number'
      ? getPostItPinImage(post.pinSeed)
      : getPostItPinImageForKey(post.id);

  return (
    <View
      accessible
      accessibilityLabel={`${post.authorLabel} prayer note. ${post.title}`}
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
      <View pointerEvents="none" style={styles.noteUnderCurl} />
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
      </View>
      <Text style={styles.noteTitle}>{post.title}</Text>
      <Text style={styles.noteBody}>{post.body}</Text>
      <View style={styles.noteFooter}>
        <View style={styles.noteReactionRow}>
          {reactionLabels.map((reaction) => {
            const count = reactions.filter((item) => item.type === reaction.type).length;

            return (
              <Pressable
                key={reaction.type}
                accessibilityRole="button"
                accessibilityLabel={`${reaction.label} reaction, ${count} selected`}
                onPress={() => onReact(reaction.type)}
                style={styles.noteReactionButton}>
                {reaction.type === 'prayer' || reaction.type === 'love' ? (
                  <AnimatedAsset assetKey={`reaction_${reaction.type}`} size={20} />
                ) : (
                  <ReactionIcon type={reaction.type} size={19} />
                )}
                <Text style={styles.noteReactionCount}>{count}</Text>
              </Pressable>
            );
          })}
        </View>
        <PrayerCardArt mood={post.mood} size={56} variant={index} />
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
    paddingTop: 28,
    paddingBottom: Platform.select({ web: 126, default: 40 }),
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
    gap: 12,
    marginBottom: 22,
  },
  quickActionRow: {
    minHeight: 76,
    borderRadius: 28,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...softShadow,
  },
  createGroupRow: {
    backgroundColor: '#FFF6F0',
  },
  createIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    flex: 1,
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  chevron: {
    color: colors.accent,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
  },
  groupStack: {
    gap: 16,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(10, 6, 0, 0.76)',
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
  joinInfoCard: {
    minHeight: 86,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(10, 6, 0, 0.88)',
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
    backgroundColor: '#0A0600',
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
    justifyContent: 'space-between',
  },
  createTopSpacer: {
    width: 58,
    height: 58,
  },
  createCircleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0A0600',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
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
  createBrand: {
    color: '#FF8A5B',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
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
    borderColor: 'rgba(10, 6, 0, 0.24)',
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
  detailHeader: {
    minHeight: 96,
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  detailCirclePost: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  memberPill: {
    flex: 1,
    maxWidth: 166,
    minHeight: 58,
    borderRadius: 29,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...softShadow,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  prayerNote: {
    aspectRatio: 0.89,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 26,
    paddingTop: 36,
    overflow: 'visible',
    ...cardShadow,
  },
  noteFloatingShadow: {
    position: 'absolute',
    left: 22,
    right: 16,
    bottom: -17,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 6, 0, 0.18)',
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
    backgroundColor: 'rgba(10, 6, 0, 0.052)',
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
    backgroundColor: 'rgba(10, 6, 0, 0.055)',
  },
  noteEdgeShade: {
    position: 'absolute',
    top: 42,
    right: 0,
    bottom: 14,
    width: 26,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(10, 6, 0, 0.045)',
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
  noteUnderCurl: {
    position: 'absolute',
    left: 24,
    right: 14,
    bottom: -11,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 6, 0, 0.16)',
    opacity: 0.22,
    transform: [{ scaleY: 0.3 }, { rotate: '-1.2deg' }],
  },
  noteBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(10, 6, 0, 0.048)',
  },
  noteFoldShadow: {
    position: 'absolute',
    bottom: -4,
    width: 52,
    height: 52,
    backgroundColor: 'rgba(10, 6, 0, 0.16)',
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
  noteAuthor: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  noteMeta: {
    marginTop: 2,
    color: colors.textSecondary,
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
  noteBody: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    zIndex: 2,
  },
  noteFooter: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 2,
  },
  noteReactionRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  noteReactionButton: {
    minHeight: 36,
    minWidth: 48,
    borderRadius: 16,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noteReactionCount: {
    color: colors.text,
    fontSize: 12,
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
