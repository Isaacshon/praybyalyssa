import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodFace, PostItCornerFold, ReactionIcon, UtilityIcon } from '@/components/praybor/PrayborArtwork';
import { getPostItPinImage } from '@/components/praybor/postItPins';
import { Colors } from '@/constants/theme';
import {
  MOODS,
  createPrayerDraft,
  type MoodId,
  type PrayerDraft,
  type PrayerIdentity,
} from '@/lib/praybor/domain';
import {
  planSituationPromptInsert,
  reconcileSituationBodyChange,
  type SituationComposerState,
} from '@/lib/praybor/situation-compose-state';

type PrayerComposerSheetProps = {
  visible: boolean;
  defaultVisibility: 'public' | 'group';
  groupId?: string;
  onClose: () => void;
  onCreate: (draft: PrayerDraft) => void | Promise<void>;
};

const floatingPanelShadow = Platform.select({
  web: { boxShadow: '0 18px 40px rgba(255, 138, 91, 0.18)' },
  default: {
    shadowColor: '#FF8A5B',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
});

const noteShadow = Platform.select({
  web: {
    boxShadow:
      '0 26px 30px rgba(42, 28, 19, 0.14), 12px 18px 20px rgba(42, 28, 19, 0.10), -8px 18px 16px rgba(42, 28, 19, 0.06), 0 2px 0 rgba(255, 255, 255, 0.34) inset',
  },
  default: {
    shadowColor: '#2a1c13',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 16 },
    elevation: 5,
  },
});

type SituationPrompt = {
  id: string;
  category: string;
  label: string;
  phrase: string;
  title: string;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragPreview = {
  color: string;
  label: string;
  x: number;
  y: number;
};

type PointerLikeEvent = {
  nativeEvent: {
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
  };
};

const defaultMood: MoodId = 'joy';
const identityOptions: { id: PrayerIdentity; label: string }[] = [
  { id: 'anonymous', label: 'Anonymous' },
  { id: 'real_name', label: 'My name' },
];
const categoryStickerColors: Record<string, string> = {
  'People and family': 'rgba(255, 137, 151, 0.52)',
  'Heart and mind': 'rgba(143, 223, 170, 0.48)',
  'Health and care': 'rgba(107, 199, 238, 0.46)',
  'Work and future': 'rgba(244, 198, 105, 0.52)',
  'Faith and church': 'rgba(190, 143, 225, 0.44)',
};

const stickerShadow = Platform.select({
  web: { boxShadow: '0 7px 12px rgba(42, 28, 19, 0.08), 0 1px 0 rgba(255, 255, 255, 0.35) inset' },
  default: {
    shadowColor: '#2a1c13',
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
});

const stickerWebStyle =
  Platform.OS === 'web'
    ? ({
        cursor: 'grab',
        userSelect: 'none',
      } as unknown as ViewStyle)
    : undefined;

const situationPrompts: SituationPrompt[] = [
  {
    id: 'relationship_conflict',
    category: 'People and family',
    label: 'For a hard conversation',
    phrase: 'a hard conversation to become gentle and honest',
    title: 'Prayer for a hard conversation',
  },
  {
    id: 'relationship_repair',
    category: 'People and family',
    label: 'For reconciliation',
    phrase: 'reconciliation and softened hearts',
    title: 'Prayer for reconciliation',
  },
  {
    id: 'relationship_closeness',
    category: 'People and family',
    label: 'For restored trust',
    phrase: 'restored trust in a relationship',
    title: 'Prayer for restored trust',
  },
  {
    id: 'family_tension',
    category: 'People and family',
    label: 'For peace at home',
    phrase: 'peace at home where there is tension',
    title: 'Prayer for family peace',
  },
  {
    id: 'forgiveness',
    category: 'People and family',
    label: 'For forgiving someone',
    phrase: 'the grace to forgive without bitterness',
    title: 'Prayer for forgiveness',
  },
  {
    id: 'loneliness',
    category: 'People and family',
    label: 'For a lonely season',
    phrase: 'comfort in a lonely season',
    title: 'Prayer for loneliness',
  },
  {
    id: 'friendship_drift',
    category: 'People and family',
    label: 'For a drifting friend',
    phrase: 'a drifting friendship to be cared for wisely',
    title: 'Prayer for friendship',
  },
  {
    id: 'dating_wisdom',
    category: 'People and family',
    label: 'For dating with wisdom',
    phrase: 'wisdom and purity in dating',
    title: 'Prayer for dating wisdom',
  },
  {
    id: 'church_community',
    category: 'People and family',
    label: 'For church belonging',
    phrase: 'belonging and friendship in church community',
    title: 'Prayer for community',
  },
  {
    id: 'marriage_tension',
    category: 'People and family',
    label: 'For marriage peace',
    phrase: 'peace and tenderness in marriage',
    title: 'Prayer for marriage peace',
  },
  {
    id: 'parent_child',
    category: 'People and family',
    label: 'For parent-child peace',
    phrase: 'patience and understanding between parent and child',
    title: 'Prayer for family understanding',
  },
  {
    id: 'anxiety',
    category: 'Heart and mind',
    label: 'For peace from anxiety',
    phrase: 'peace where anxiety feels loud',
    title: 'Prayer for peace',
  },
  {
    id: 'exhaustion',
    category: 'Heart and mind',
    label: 'For deep rest',
    phrase: 'deep rest from emotional exhaustion',
    title: 'Prayer for rest',
  },
  {
    id: 'grief',
    category: 'Heart and mind',
    label: 'For grief to be held',
    phrase: 'comfort while grief feels heavy',
    title: 'Prayer for grief',
  },
  {
    id: 'discouragement',
    category: 'Heart and mind',
    label: 'For hope again',
    phrase: 'hope to rise again in discouragement',
    title: 'Prayer for hope',
  },
  {
    id: 'anger',
    category: 'Heart and mind',
    label: 'For patience with anger',
    phrase: 'patience and self-control where anger is near',
    title: 'Prayer for patience',
  },
  {
    id: 'shame',
    category: 'Heart and mind',
    label: 'For freedom from shame',
    phrase: 'freedom from shame and harsh self-judgment',
    title: 'Prayer for freedom',
  },
  {
    id: 'overthinking',
    category: 'Heart and mind',
    label: 'For a quiet mind',
    phrase: 'a quiet mind while overthinking',
    title: 'Prayer for a quiet mind',
  },
  {
    id: 'fear_future',
    category: 'Heart and mind',
    label: 'For fear of the future',
    phrase: 'trust when the future feels uncertain',
    title: 'Prayer for trust',
  },
  {
    id: 'self_worth',
    category: 'Heart and mind',
    label: 'For remembering worth',
    phrase: 'a clear reminder of God-given worth',
    title: 'Prayer for worth',
  },
  {
    id: 'health_recovery',
    category: 'Health and care',
    label: 'For healing and recovery',
    phrase: 'healing and steady recovery',
    title: 'Prayer for healing',
  },
  {
    id: 'treatment',
    category: 'Health and care',
    label: 'For treatment strength',
    phrase: 'strength and courage during treatment',
    title: 'Prayer during treatment',
  },
  {
    id: 'sleep',
    category: 'Health and care',
    label: 'For restful sleep',
    phrase: 'restful sleep',
    title: 'Prayer for sleep',
  },
  {
    id: 'chronic_pain',
    category: 'Health and care',
    label: 'For chronic pain',
    phrase: 'endurance through chronic pain',
    title: 'Prayer through pain',
  },
  {
    id: 'caregiver_strength',
    category: 'Health and care',
    label: 'For caregiving strength',
    phrase: 'strength for caregiving',
    title: 'Prayer for caregiving',
  },
  {
    id: 'mental_health',
    category: 'Health and care',
    label: 'For mental health support',
    phrase: 'steady support for mental health',
    title: 'Prayer for mental health',
  },
  {
    id: 'doctor_wisdom',
    category: 'Health and care',
    label: 'For doctors wisdom',
    phrase: 'wisdom for doctors and caregivers',
    title: 'Prayer for doctors',
  },
  {
    id: 'surgery',
    category: 'Health and care',
    label: 'For surgery peace',
    phrase: 'peace and protection around surgery',
    title: 'Prayer for surgery',
  },
  {
    id: 'medical_answers',
    category: 'Health and care',
    label: 'For clear answers',
    phrase: 'clear answers in medical uncertainty',
    title: 'Prayer for medical answers',
  },
  {
    id: 'decision',
    category: 'Work and future',
    label: 'For a wise decision',
    phrase: 'wisdom for a decision',
    title: 'Prayer for wisdom',
  },
  {
    id: 'interview',
    category: 'Work and future',
    label: 'For interview peace',
    phrase: 'peace and clarity for an interview',
    title: 'Prayer for an interview',
  },
  {
    id: 'exam',
    category: 'Work and future',
    label: 'For exam focus',
    phrase: 'focus while preparing for an exam',
    title: 'Prayer for focus',
  },
  {
    id: 'financial_pressure',
    category: 'Work and future',
    label: 'For provision',
    phrase: 'provision under financial pressure',
    title: 'Prayer for provision',
  },
  {
    id: 'burnout',
    category: 'Work and future',
    label: 'For burnout recovery',
    phrase: 'rest from burnout',
    title: 'Prayer for burnout',
  },
  {
    id: 'new_job',
    category: 'Work and future',
    label: 'For a new job',
    phrase: 'courage in a new job',
    title: 'Prayer for a new job',
  },
  {
    id: 'team_conflict',
    category: 'Work and future',
    label: 'For work conflict',
    phrase: 'peace in team conflict',
    title: 'Prayer for work peace',
  },
  {
    id: 'time_pressure',
    category: 'Work and future',
    label: 'For time pressure',
    phrase: 'clarity under time pressure',
    title: 'Prayer under pressure',
  },
  {
    id: 'job_search',
    category: 'Work and future',
    label: 'For a job search',
    phrase: 'open doors and patience in a job search',
    title: 'Prayer for a job search',
  },
  {
    id: 'future_direction',
    category: 'Work and future',
    label: 'For future direction',
    phrase: 'direction for the next season',
    title: 'Prayer for direction',
  },
  {
    id: 'faith_strength',
    category: 'Faith and church',
    label: 'For renewed faith',
    phrase: 'renewed faith',
    title: 'Prayer for renewed faith',
  },
  {
    id: 'guidance',
    category: 'Faith and church',
    label: "For God's guidance",
    phrase: "God's guidance and patience",
    title: 'Prayer for guidance',
  },
  {
    id: 'gratitude',
    category: 'Faith and church',
    label: 'For a thankful heart',
    phrase: 'a grateful heart',
    title: 'Prayer of gratitude',
  },
  {
    id: 'protection',
    category: 'Faith and church',
    label: 'For protection',
    phrase: 'protection and steady courage',
    title: 'Prayer for protection',
  },
  {
    id: 'doubt',
    category: 'Faith and church',
    label: 'For honest doubt',
    phrase: 'honest faith in doubt',
    title: 'Prayer through doubt',
  },
  {
    id: 'obedience',
    category: 'Faith and church',
    label: 'For courage to obey',
    phrase: 'courage to obey',
    title: 'Prayer for obedience',
  },
  {
    id: 'spiritual_dryness',
    category: 'Faith and church',
    label: 'For a dry season',
    phrase: 'renewal in a spiritually dry season',
    title: 'Prayer for renewal',
  },
  {
    id: 'answered_prayer',
    category: 'Faith and church',
    label: 'For an answered prayer',
    phrase: 'gratitude for an answered prayer',
    title: 'Prayer of thanks',
  },
  {
    id: 'scripture_desire',
    category: 'Faith and church',
    label: 'For love of Scripture',
    phrase: 'a renewed love for Scripture',
    title: 'Prayer for Scripture',
  },
  {
    id: 'serving_church',
    category: 'Faith and church',
    label: 'For serving faithfully',
    phrase: 'humility and joy while serving the church',
    title: 'Prayer for serving',
  },
];

const situationCategories = Array.from(
  new Set(situationPrompts.map((prompt) => prompt.category)),
);

export function PrayerComposerSheet({
  visible,
  defaultVisibility,
  groupId,
  onClose,
  onCreate,
}: PrayerComposerSheetProps) {
  const colors = Colors.light;
  const noteRef = useRef<View | null>(null);
  const noteBounds = useRef<Bounds | null>(null);
  const [mood, setMood] = useState<MoodId>(defaultMood);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [situationIds, setSituationIds] = useState<string[]>([]);
  const [identity, setIdentity] = useState<PrayerIdentity>('anonymous');
  const [generatedSituationTitle, setGeneratedSituationTitle] = useState('');
  const [generatedSituationBody, setGeneratedSituationBody] = useState('');
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [dragOverNote, setDragOverNote] = useState(false);
  const [error, setError] = useState('');
  const [notePinSeed, setNotePinSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSituationCategories, setExpandedSituationCategories] = useState<string[]>([
    situationCategories[0],
  ]);

  const selectedMood = MOODS.find((option) => option.id === mood);
  const canPost = useMemo(() => Boolean(title.trim() && body.trim()), [body, title]);
  const noteColor = selectedMood?.color ?? MOODS[0].color;
  const notePinImage = getPostItPinImage(notePinSeed);
  const foldOnLeft = notePinSeed % 2 === 1;
  const foldSideStyles = foldOnLeft
    ? {
        fold: styles.previewFoldLeft,
        shadow: styles.previewFoldShadowLeft,
        shadowCurve: styles.previewFloatingShadowLeft,
        side: 'left' as const,
      }
    : {
        fold: styles.previewFoldRight,
        shadow: styles.previewFoldShadowRight,
        shadowCurve: styles.previewFloatingShadowRight,
        side: 'right' as const,
      };

  useEffect(() => {
    if (visible) {
      setNotePinSeed(Math.floor(Math.random() * 1000));
      setIdentity('anonymous');
    }
  }, [visible]);

  function measureNote() {
    noteRef.current?.measureInWindow((x, y, width, height) => {
      noteBounds.current = { x, y, width, height };
    });
  }

  function handleNoteLayout(_event: LayoutChangeEvent) {
    requestAnimationFrame(measureNote);
  }

  function isInsideNote(x: number, y: number) {
    const bounds = noteBounds.current;

    if (!bounds) {
      return false;
    }

    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  function applySituationPrompt(prompt: SituationPrompt) {
    syncSituationState(
      planSituationPromptInsert(getSituationComposerState(), prompt, situationPrompts),
    );
    setError('');
  }

  function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);

    if (nextTitle.trim() !== generatedSituationTitle) {
      setGeneratedSituationTitle('');
    }
  }

  function handleBodyChange(nextBody: string) {
    syncSituationState(reconcileSituationBodyChange(getSituationComposerState(), nextBody));
  }

  function getSituationComposerState(): SituationComposerState {
    return {
      body,
      generatedSituationBody,
      generatedSituationTitle,
      situationIds,
      title,
    };
  }

  function syncSituationState(nextState: SituationComposerState) {
    setTitle(nextState.title);
    setBody(nextState.body);
    setSituationIds(nextState.situationIds);
    setGeneratedSituationTitle(nextState.generatedSituationTitle);
    setGeneratedSituationBody(nextState.generatedSituationBody);
  }

  function rerollNotePin() {
    setNotePinSeed((currentSeed) => currentSeed + 1 + Math.floor(Math.random() * 12));
  }

  function selectMood(nextMood: MoodId) {
    setMood(nextMood);
    rerollNotePin();
  }

  function toggleSituationCategory(category: string) {
    setExpandedSituationCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function handleSituationDragStart(prompt: SituationPrompt, x: number, y: number) {
    measureNote();
    setDragPreview({
      color: getSituationStickerColor(prompt.category),
      label: prompt.label,
      x,
      y,
    });
    setDragOverNote(isInsideNote(x, y));
  }

  function handleSituationDragMove(x: number, y: number) {
    setDragPreview((preview) => preview ? { ...preview, x, y } : preview);
    setDragOverNote(isInsideNote(x, y));
  }

  function handleSituationDragEnd(prompt: SituationPrompt, x: number, y: number) {
    if (isInsideNote(x, y)) {
      applySituationPrompt(prompt);
    }

    setDragPreview(null);
    setDragOverNote(false);
  }

  async function submit() {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const draft = createPrayerDraft({
        title: title.trim(),
        body: body.trim(),
        mood,
        visibility: defaultVisibility,
        identity,
        groupId,
        paperColor: noteColor,
        pinSeed: notePinSeed,
      });
      await onCreate(draft);
      setMood(defaultMood);
      setTitle('');
      setBody('');
      setSituationIds([]);
      setGeneratedSituationTitle('');
      setGeneratedSituationBody('');
      setError('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to post prayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back from prayer composer"
            hitSlop={8}
            onPress={onClose}
            style={styles.backTag}>
            <UtilityIcon type="back" size={20} color="#2a1c13" />
          </Pressable>
        </View>

        <View style={styles.noteStage}>
          <View style={styles.previewNoteFrame}>
            <View pointerEvents="none" style={[styles.previewFloatingShadow, foldSideStyles.shadowCurve]} />
            <View pointerEvents="none" style={styles.previewPinWrap}>
              <View style={styles.previewPinImageShell}>
                <Image source={notePinImage} resizeMode="contain" style={styles.previewPinImage} />
              </View>
            </View>

            <View
              ref={noteRef}
              onLayout={handleNoteLayout}
              style={[
                styles.previewNote,
                dragOverNote && styles.previewNoteDropActive,
                { backgroundColor: noteColor, borderColor: dragOverNote ? '#FF8A5B' : '#FFFFFF' },
              ]}>
              <View pointerEvents="none" style={styles.previewPaperGrain} />
              <View pointerEvents="none" style={styles.previewAdhesiveBand} />
              <View pointerEvents="none" style={styles.previewSurfaceWash} />
              <View pointerEvents="none" style={styles.previewTopCrease} />
              <View pointerEvents="none" style={styles.previewFiberTop} />
              <View pointerEvents="none" style={styles.previewLeftLift} />
              <View pointerEvents="none" style={styles.previewEdgeShade} />
              <View pointerEvents="none" style={styles.previewBottomShade} />
              <View pointerEvents="none" style={[styles.previewFoldShadow, foldSideStyles.shadow]} />
              <View pointerEvents="none" style={[styles.previewFold, foldSideStyles.fold]}>
                <PostItCornerFold color={noteColor} side={foldSideStyles.side} size={48} />
              </View>
              <TextInput
                accessibilityLabel="Prayer title"
                placeholder="Add a title to this prayer"
                placeholderTextColor="rgba(45,48,42,0.52)"
                value={title}
                onChangeText={handleTitleChange}
                multiline
                style={styles.noteTitleInput}
              />
              <TextInput
                accessibilityLabel="Prayer details"
                placeholder="Write the prayer you want others to carry with you."
                placeholderTextColor="rgba(45,48,42,0.48)"
                value={body}
                onChangeText={handleBodyChange}
                multiline
                textAlignVertical="top"
                style={styles.noteBodyInput}
              />
              {dragOverNote ? (
                <View pointerEvents="none" style={styles.dropHint}>
                  <Text style={styles.dropHintText}>Drop sticker here</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.bottomPanel, floatingPanelShadow]}>
          <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
            <View style={styles.optionSection}>
              <Text style={styles.sectionLabel}>Note color</Text>
              <View style={styles.moodRail}>
                {MOODS.map((option) => {
                  const selected = option.id === mood;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.accessibilityLabel}
                      onPress={() => selectMood(option.id)}
                      style={[
                        styles.moodDot,
                        {
                          borderColor: selected ? colors.text : 'rgba(25,34,28,0.08)',
                          backgroundColor: selected ? '#FFFFFF' : `${option.color}2C`,
                        },
                      ]}>
                      <MoodFace mood={option.id} size={21} />
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.selectedMoodLabel}>
                {selectedMood?.label ?? 'Joy'}
              </Text>
            </View>

            <View style={styles.optionSection}>
              <Text style={styles.sectionLabel}>Post as</Text>
              <View style={styles.identityRow}>
                {identityOptions.map((option) => {
                  const selected = option.id === identity;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Post as ${option.label}`}
                      onPress={() => setIdentity(option.id)}
                      style={[
                        styles.identityButton,
                        selected && styles.identityButtonSelected,
                      ]}>
                      <Text
                        style={[
                          styles.identityButtonText,
                          selected && styles.identityButtonTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.optionSection}>
              <Text style={styles.sectionLabel}>Situation cards</Text>
              <Text style={styles.sectionHint}>Tap a sticker, or drag it onto the note.</Text>
              <View style={styles.situationCategoryStack}>
                {situationCategories.map((category) => {
                  const categoryPrompts = situationPrompts.filter((prompt) => prompt.category === category);
                  const selectedCount = categoryPrompts.filter((prompt) => situationIds.includes(prompt.id)).length;
                  const expanded = expandedSituationCategories.includes(category);

                  return (
                    <View key={category} style={styles.situationCategoryGroup}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${category} situations`}
                        onPress={() => toggleSituationCategory(category)}
                        style={({ pressed }) => [
                          styles.situationCategoryHeader,
                          expanded && styles.situationCategoryHeaderExpanded,
                          pressed && styles.situationCategoryHeaderPressed,
                        ]}>
                        <View style={styles.situationCategoryHeaderText}>
                          <Text style={styles.situationCategoryLabel}>{category}</Text>
                          <Text style={styles.situationCategoryMeta}>
                            {selectedCount ? `${selectedCount} selected` : `${categoryPrompts.length} stickers`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.situationCategoryChevron,
                            expanded && styles.situationCategoryChevronExpanded,
                          ]}>
                          <UtilityIcon type="chevronDown" size={18} color="#2a1c13" />
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View style={styles.situationChipRow}>
                          {categoryPrompts.map((prompt, stickerIndex) => (
                            <SituationChip
                              key={prompt.id}
                              color={getSituationStickerColor(prompt.category)}
                              prompt={prompt}
                              selected={situationIds.includes(prompt.id)}
                              tilt={stickerIndex % 4}
                              variant={stickerIndex % 5}
                              onInsert={applySituationPrompt}
                              onDragStart={handleSituationDragStart}
                              onDragMove={handleSituationDragMove}
                              onDragEnd={handleSituationDragEnd}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <ActionButton
                icon="share"
                label={isSubmitting ? 'Sharing...' : 'Share my prayer request'}
                onPress={submit}
                disabled={!canPost || isSubmitting}
                primary
              />
            </View>
          </ScrollView>
        </View>
        {dragPreview ? (
          <View
            pointerEvents="none"
            style={[
              styles.dragGhost,
              { backgroundColor: dragPreview.color },
              {
                transform: [
                  { translateX: dragPreview.x - 86 },
                  { translateY: dragPreview.y - 24 },
                  { rotate: '-4deg' },
                ],
              } as ViewStyle,
            ]}>
            <Text style={styles.dragGhostText}>{dragPreview.label}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function SituationChip({
  color,
  onDragEnd,
  onDragMove,
  onDragStart,
  onInsert,
  prompt,
  selected,
  tilt,
  variant,
}: {
  color: string;
  onDragEnd: (prompt: SituationPrompt, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragStart: (prompt: SituationPrompt, x: number, y: number) => void;
  onInsert: (prompt: SituationPrompt) => void;
  prompt: SituationPrompt;
  selected: boolean;
  tilt: number;
  variant: number;
}) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerDragging = useRef(false);
  const skipNextPress = useRef(false);
  const dragResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gestureState) =>
      Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8,
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8,
    onPanResponderGrant: (_, gestureState) => {
      onDragStart(prompt, gestureState.x0, gestureState.y0);
    },
    onPanResponderMove: (_, gestureState) => {
      onDragMove(gestureState.moveX, gestureState.moveY);
    },
    onPanResponderRelease: (_, gestureState) => {
      const moved = Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 8;

      if (moved) {
        onDragEnd(prompt, gestureState.moveX, gestureState.moveY);
      }
    },
    onPanResponderTerminate: (_, gestureState) => {
      onDragEnd(prompt, gestureState.moveX, gestureState.moveY);
    },
  });

  function getPointerPoint(event: PointerLikeEvent) {
    return {
      x: event.nativeEvent.clientX ?? event.nativeEvent.pageX ?? 0,
      y: event.nativeEvent.clientY ?? event.nativeEvent.pageY ?? 0,
    };
  }

  function handlePointerDown(event: PointerLikeEvent) {
    pointerStart.current = getPointerPoint(event);
    pointerDragging.current = false;
  }

  function handlePointerMove(event: PointerLikeEvent) {
    const start = pointerStart.current;

    if (!start) {
      return;
    }

    const point = getPointerPoint(event);
    const distance = Math.abs(point.x - start.x) + Math.abs(point.y - start.y);

    if (distance > 8 && !pointerDragging.current) {
      pointerDragging.current = true;
      onDragStart(prompt, start.x, start.y);
    }

    if (pointerDragging.current) {
      onDragMove(point.x, point.y);
    }
  }

  function handlePointerEnd(event: PointerLikeEvent) {
    if (pointerDragging.current) {
      const point = getPointerPoint(event);
      skipNextPress.current = true;
      onDragEnd(prompt, point.x, point.y);
    }

    pointerStart.current = null;
    pointerDragging.current = false;
  }

  useEffect(() => () => removeWebListeners(), []);

  function removeWebListeners() {
    removeWebListenersRef.current?.();
    removeWebListenersRef.current = null;
  }

  const removeWebListenersRef = useRef<(() => void) | null>(null);

  function startWebMouseDrag(event: PointerLikeEvent) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    removeWebListeners();
    const start = getPointerPoint(event);
    pointerStart.current = start;
    pointerDragging.current = false;

    const handleMouseMove = (mouseEvent: MouseEvent) => {
      const point = { x: mouseEvent.clientX, y: mouseEvent.clientY };
      const distance = Math.abs(point.x - start.x) + Math.abs(point.y - start.y);

      if (distance > 8 && !pointerDragging.current) {
        pointerDragging.current = true;
        onDragStart(prompt, start.x, start.y);
      }

      if (pointerDragging.current) {
        onDragMove(point.x, point.y);
      }
    };

    const handleMouseUp = (mouseEvent: MouseEvent) => {
      if (pointerDragging.current) {
        skipNextPress.current = true;
        onDragEnd(prompt, mouseEvent.clientX, mouseEvent.clientY);
      }

      pointerStart.current = null;
      pointerDragging.current = false;
      removeWebListeners();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    removeWebListenersRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }

  const webMouseHandlers = Platform.OS === 'web'
    ? ({
        draggable: true,
        onDragStart: (event: DragEvent) => {
          const point = { x: event.clientX, y: event.clientY };
          onDragStart(prompt, point.x, point.y);
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('text/plain', prompt.label);
          }
        },
        onDrag: (event: DragEvent) => {
          if (event.clientX || event.clientY) {
            onDragMove(event.clientX, event.clientY);
          }
        },
        onDragEnd: (event: DragEvent) => {
          onDragEnd(prompt, event.clientX, event.clientY);
          skipNextPress.current = true;
        },
        onMouseDown: handlePointerDown,
        onMouseMove: handlePointerMove,
        onMouseUp: handlePointerEnd,
      } as Record<string, unknown>)
    : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Add ${prompt.label} situation`}
      onPressIn={startWebMouseDrag}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPress={() => {
        if (skipNextPress.current) {
          skipNextPress.current = false;
          return;
        }

        onInsert(prompt);
      }}
      style={[
        styles.situationChip,
        tapeTiltStyles[tilt],
        stickerWebStyle,
        { backgroundColor: color },
        selected && styles.situationChipSelected,
      ]}
      {...webMouseHandlers}
      {...dragResponder.panHandlers}>
      <View pointerEvents="none" style={[styles.situationTapeFiber, tapeFiberStyles[variant]]} />
      <View pointerEvents="none" style={[styles.situationTapeCrease, tapeCreaseStyles[variant]]} />
      <View pointerEvents="none" style={[styles.situationTapeSoftCrease, tapeSoftCreaseStyles[variant]]} />
      <View pointerEvents="none" style={[styles.situationTapeLeftTear, tapeLeftTearStyles[variant]]} />
      <View pointerEvents="none" style={[styles.situationTapeRightTear, tapeRightTearStyles[variant]]} />
      <Text style={[styles.situationChipText, selected && styles.situationChipTextSelected]}>
        {prompt.label}
      </Text>
    </Pressable>
  );
}

function getSituationStickerColor(category: string) {
  return categoryStickerColors[category] ?? '#FFF4EC';
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  primary,
}: {
  disabled?: boolean;
  icon: 'share' | 'save';
  label: string;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, primary && styles.actionButtonPrimary, disabled && styles.actionButtonDisabled]}>
      {icon === 'save' ? <ReactionIcon type="review" size={20} color="#2a1c13" /> : <UtilityIcon type={icon} size={22} color="#2a1c13" />}
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backTag: {
    width: 48,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FF8A5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteStage: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  previewNoteFrame: {
    position: 'relative',
    width: '78%',
    paddingTop: 24,
    paddingBottom: 14,
    transform: [{ rotate: '-4.4deg' }],
  },
  previewFloatingShadow: {
    position: 'absolute',
    left: 18,
    right: 12,
    bottom: 2,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 28, 19, 0.18)',
    opacity: 0.28,
    transform: [{ scaleY: 0.32 }, { rotate: '-1deg' }],
  },
  previewFloatingShadowRight: {
    right: 4,
    left: 24,
  },
  previewFloatingShadowLeft: {
    left: 4,
    right: 24,
    transform: [{ scaleY: 0.32 }, { rotate: '1deg' }],
  },
  previewPinWrap: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    zIndex: 4,
    height: 64,
    alignItems: 'center',
  },
  previewPinImageShell: {
    width: 62,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  previewPinImage: {
    width: 92,
    height: 92,
  },
  previewNote: {
    minHeight: 204,
    borderRadius: 7,
    borderWidth: 3,
    padding: 18,
    paddingTop: 28,
    overflow: 'visible',
    zIndex: 2,
    ...noteShadow,
  },
  previewNoteDropActive: {
    borderWidth: 5,
  },
  previewPaperGrain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  previewAdhesiveBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 38,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: 'rgba(42, 28, 19, 0.055)',
  },
  previewSurfaceWash: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    bottom: 42,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    opacity: 0.76,
    transform: [{ rotate: '-1.4deg' }],
  },
  previewTopCrease: {
    position: 'absolute',
    top: 38,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(42, 28, 19, 0.055)',
  },
  previewFiberTop: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    height: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  previewEdgeShade: {
    position: 'absolute',
    top: 38,
    right: 0,
    bottom: 14,
    width: 20,
    borderBottomRightRadius: 16,
    backgroundColor: 'rgba(42, 28, 19, 0.043)',
  },
  previewLeftLift: {
    position: 'absolute',
    top: 44,
    left: 0,
    bottom: 20,
    width: 11,
    borderBottomLeftRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: 'rgba(42, 28, 19, 0.048)',
  },
  previewFoldShadow: {
    position: 'absolute',
    bottom: -4,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(42, 28, 19, 0.16)',
    opacity: 0.2,
    transform: [{ skewX: '-12deg' }],
  },
  previewFold: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 48,
    zIndex: 1,
  },
  previewFoldRight: {
    right: 0,
  },
  previewFoldLeft: {
    left: 0,
  },
  previewFoldShadowRight: {
    right: 2,
  },
  previewFoldShadowLeft: {
    left: 2,
    transform: [{ skewX: '12deg' }],
  },
  dropHint: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(42, 28, 19, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropHintText: {
    color: '#2a1c13',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  noteTitleInput: {
    minHeight: 34,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: '#2a1c13',
  },
  noteBodyInput: {
    minHeight: 126,
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: '#2a1c13',
  },
  bottomPanel: {
    maxHeight: 390,
    marginHorizontal: 14,
    marginBottom: 24,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelContent: {
    padding: 16,
    gap: 13,
  },
  optionSection: {
    gap: 7,
  },
  sectionLabel: {
    color: '#69543a',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  sectionHint: {
    marginTop: -3,
    color: '#69543a',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  moodRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  moodDot: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMoodLabel: {
    color: '#2a1c13',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  identityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  identityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 91, 0.18)',
    backgroundColor: '#FFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  identityButtonSelected: {
    borderColor: '#FF8A5B',
    backgroundColor: '#FF8A5B',
  },
  identityButtonText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  identityButtonTextSelected: {
    color: '#FFFFFF',
  },
  situationCategoryStack: {
    gap: 8,
  },
  situationCategoryGroup: {
    gap: 7,
  },
  situationCategoryHeader: {
    minHeight: 47,
    borderRadius: 15,
    paddingLeft: 14,
    paddingRight: 10,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 91, 0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  situationCategoryHeaderExpanded: {
    backgroundColor: '#FFF1EA',
    borderColor: 'rgba(255, 138, 91, 0.32)',
  },
  situationCategoryHeaderPressed: {
    opacity: 0.72,
  },
  situationCategoryHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  situationCategoryLabel: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  situationCategoryMeta: {
    marginTop: 2,
    color: '#69543a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  situationCategoryChevron: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  situationCategoryChevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  situationChipRow: {
    gap: 10,
  },
  situationChip: {
    width: '100%',
    minHeight: 45,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    paddingLeft: 26,
    paddingRight: 26,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...stickerShadow,
  },
  situationChipSelected: {
    borderColor: '#FF8A5B',
    borderWidth: 2,
  },
  situationTapeFiber: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  situationTapeCrease: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: '58%',
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(42, 28, 19, 0.07)',
    transform: [{ rotate: '-8deg' }],
  },
  situationTapeSoftCrease: {
    position: 'absolute',
    top: 9,
    bottom: 7,
    width: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  situationTapeLeftTear: {
    position: 'absolute',
    top: -5,
    left: -8,
    width: 20,
    height: 58,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '5deg' }],
  },
  situationTapeRightTear: {
    position: 'absolute',
    right: -10,
    bottom: -6,
    width: 22,
    height: 60,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-7deg' }],
  },
  situationChipText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  situationChipTextSelected: {
    color: '#2a1c13',
  },
  dragGhost: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    minHeight: 52,
    minWidth: 164,
    maxWidth: 224,
    borderRadius: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(42, 28, 19, 0.10)',
    ...noteShadow,
  },
  dragGhostText: {
    color: '#2a1c13',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4EC',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '800',
  },
  collaborationRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  collaborationChip: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collaborationText: {
    color: '#2a1c13',
    fontSize: 12,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 0,
  },
  actionButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 21,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  actionButtonPrimary: {
    backgroundColor: '#FF8A5B',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionText: {
    color: '#2a1c13',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  actionTextPrimary: {
    color: '#2a1c13',
  },
  errorText: {
    color: '#D43D3D',
    fontWeight: '800',
  },
  situationTapeTilt0: {
    transform: [{ rotate: '-1.2deg' }],
  },
  situationTapeTilt1: {
    transform: [{ rotate: '0.8deg' }],
  },
  situationTapeTilt2: {
    transform: [{ rotate: '-0.4deg' }],
  },
  situationTapeTilt3: {
    transform: [{ rotate: '1.3deg' }],
  },
  tapeFiber0: {
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
  },
  tapeFiber1: {
    backgroundColor: 'rgba(255, 255, 255, 0.21)',
  },
  tapeFiber2: {
    backgroundColor: 'rgba(42, 28, 19, 0.025)',
  },
  tapeFiber3: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  tapeFiber4: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tapeCrease0: {
    left: '42%',
    transform: [{ rotate: '-11deg' }],
  },
  tapeCrease1: {
    left: '63%',
    transform: [{ rotate: '8deg' }],
  },
  tapeCrease2: {
    left: '28%',
    transform: [{ rotate: '-4deg' }],
  },
  tapeCrease3: {
    left: '74%',
    transform: [{ rotate: '12deg' }],
  },
  tapeCrease4: {
    left: '52%',
    transform: [{ rotate: '-16deg' }],
  },
  tapeSoftCrease0: {
    left: '67%',
    transform: [{ rotate: '4deg' }],
  },
  tapeSoftCrease1: {
    left: '34%',
    transform: [{ rotate: '-9deg' }],
  },
  tapeSoftCrease2: {
    left: '80%',
    transform: [{ rotate: '11deg' }],
  },
  tapeSoftCrease3: {
    left: '46%',
    transform: [{ rotate: '-5deg' }],
  },
  tapeSoftCrease4: {
    left: '22%',
    transform: [{ rotate: '7deg' }],
  },
  tapeLeftTear0: {
    width: 20,
    transform: [{ rotate: '5deg' }],
  },
  tapeLeftTear1: {
    width: 14,
    transform: [{ rotate: '-8deg' }],
  },
  tapeLeftTear2: {
    width: 24,
    top: -9,
    transform: [{ rotate: '12deg' }],
  },
  tapeLeftTear3: {
    width: 18,
    bottom: -11,
    transform: [{ rotate: '-4deg' }],
  },
  tapeLeftTear4: {
    width: 11,
    transform: [{ rotate: '15deg' }],
  },
  tapeRightTear0: {
    width: 22,
    transform: [{ rotate: '-7deg' }],
  },
  tapeRightTear1: {
    width: 16,
    top: -8,
    transform: [{ rotate: '9deg' }],
  },
  tapeRightTear2: {
    width: 27,
    transform: [{ rotate: '-13deg' }],
  },
  tapeRightTear3: {
    width: 13,
    bottom: -10,
    transform: [{ rotate: '5deg' }],
  },
  tapeRightTear4: {
    width: 21,
    transform: [{ rotate: '-2deg' }],
  },
});

const tapeTiltStyles = [
  styles.situationTapeTilt0,
  styles.situationTapeTilt1,
  styles.situationTapeTilt2,
  styles.situationTapeTilt3,
];

const tapeFiberStyles = [
  styles.tapeFiber0,
  styles.tapeFiber1,
  styles.tapeFiber2,
  styles.tapeFiber3,
  styles.tapeFiber4,
];

const tapeCreaseStyles = [
  styles.tapeCrease0,
  styles.tapeCrease1,
  styles.tapeCrease2,
  styles.tapeCrease3,
  styles.tapeCrease4,
];

const tapeSoftCreaseStyles = [
  styles.tapeSoftCrease0,
  styles.tapeSoftCrease1,
  styles.tapeSoftCrease2,
  styles.tapeSoftCrease3,
  styles.tapeSoftCrease4,
];

const tapeLeftTearStyles = [
  styles.tapeLeftTear0,
  styles.tapeLeftTear1,
  styles.tapeLeftTear2,
  styles.tapeLeftTear3,
  styles.tapeLeftTear4,
];

const tapeRightTearStyles = [
  styles.tapeRightTear0,
  styles.tapeRightTear1,
  styles.tapeRightTear2,
  styles.tapeRightTear3,
  styles.tapeRightTear4,
];
